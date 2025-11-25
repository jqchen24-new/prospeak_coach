import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState, ChatMessage } from '../types';
import { createPCM16Blob, decodeAudioData } from '../utils/audioUtils';

// Configuration
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

const getSystemInstruction = (context: string) => {
  let specificInstructions = '';

  if (context === 'Job Interview') {
    specificInstructions = `
    Specific Instructions for Job Interview:
    - Act as a professional hiring manager.
    - You must ensure you cover a wide range of topics. Cycle through these types of questions:
      1. Introduction (e.g., "Tell me about yourself", "Walk me through your resume")
      2. Experience Deep Dive (e.g., "Tell me about a specific project where you had to overcome a major obstacle.", "What was your specific role in your last team?")
      3. Behavioral (e.g., "Describe a time you faced a challenge," "Tell me about a time you showed leadership", "Tell me about a mistake you made and how you handled it.")
      4. Situational (e.g., "How would you handle a disagreement with a coworker?", "What would you do if you missed a deadline?", "How do you prioritize conflicting tasks?")
      5. Cultural Fit & Values (e.g., "What kind of work environment do you thrive in?", "How do you handle constructive criticism?")
      6. Problem Solving (e.g., "Describe a complex problem you solved recently.")
      7. Strengths/Weaknesses
      8. Career Goals
      9. Leadership & People Management (e.g., "Describe your leadership style", "How do you handle underperformers?", "How do you resolve a dispute between two department heads?", "How do you mentor junior team members?")
      10. Strategic Communication (e.g., "How do you communicate bad news?", "Explain a complex concept to a non-technical audience", "How do you convince a skeptical board member to back your initiative?")
      11. Executive Scenarios (e.g. "How would you articulate the long-term vision?", "Roleplay a team meeting addressing a critical failure.", "How do you communicate a major pivot to a resistant team?")
    - Ask ONE question at a time.
    - After the user answers, provide brief feedback on their language and delivery, then move to the next question.
    `;
  }

  return `
You are ProSpeak Coach, an expert professional communication coach for non-native English speakers.
Your goal is to help the user improve their workplace communication skills in the specific context of: "${context}".

General Instructions:
1. You must speak first. IMMEDIATELY upon connection.
2. Introduce yourself as ProSpeak Coach.
3. Briefly explain that you are here to help them practice "${context}".
4. Engage in a natural, role-play conversation suited to this context.
5. Provide gentle, constructive feedback on grammar, pronunciation, and vocabulary after the user speaks, but keep the flow natural. Do not lecture.
6. Keep responses concise and encouraging.

${specificInstructions}
`;
};

export const useLiveAPI = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [volume, setVolume] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const togglePause = useCallback(async () => {
    if (!audioContextRef.current) return;

    if (isPaused) {
      await audioContextRef.current.resume();
      setIsPaused(false);
    } else {
      await audioContextRef.current.suspend();
      setIsPaused(true);
      setVolume(0); // Reset visualizer
    }
  }, [isPaused]);

  const connect = useCallback(async (context: string) => {
    if (!process.env.API_KEY) {
      setError('API Key not found in environment.');
      return;
    }

    setConnectionState(ConnectionState.CONNECTING);
    setError(null);
    setMessages([]);
    setIsPaused(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Setup Audio Contexts
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;
      nextStartTimeRef.current = 0;

      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Audio Input Processing
      // Note: In production, AudioWorklets are preferred over ScriptProcessor
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      
      scriptProcessor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate volume for visualizer
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSquares += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        // Only update volume if not paused
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
             setVolume(Math.min(1, rms * 5)); // Amplify for visualizer
        }

        const pcmBlob = createPCM16Blob(inputData);
        sessionRef.current.sendRealtimeInput({ media: pcmBlob });
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(inputCtx.destination);
      workletNodeRef.current = scriptProcessor;

      // Connect to Gemini Live API
      const session = await ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemInstruction(context),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const { serverContent } = msg;

            // Handle Audio Output
            if (serverContent?.modelTurn?.parts?.[0]?.inlineData) {
              const base64Audio = serverContent.modelTurn.parts[0].inlineData.data;
              if (base64Audio) {
                const audioBuffer = await decodeAudioData(base64Audio, audioCtx);
                
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                
                // Schedule playback
                const currentTime = audioCtx.currentTime;
                // Ensure we don't schedule in the past
                const startTime = Math.max(currentTime, nextStartTimeRef.current);
                source.start(startTime);
                
                nextStartTimeRef.current = startTime + audioBuffer.duration;
                sourceNodesRef.current.add(source);
                
                source.onended = () => {
                  sourceNodesRef.current.delete(source);
                };
              }
            }

            // Handle Text Transcription (if available, mostly relevant for turn complete or if we enable transcription)
            // Note: The Live API mainly returns audio. We can simulate transcriptions or if we enable input/output transcription config.
            // For now, we will just track turn completion to simulate "Model finished speaking".
            
            if (serverContent?.turnComplete) {
               // We could fetch text if transcription was enabled, but current config is audio-only + simulated conversation flow
            }
          },
          onclose: () => {
            setConnectionState(ConnectionState.DISCONNECTED);
            setIsPaused(false);
          },
          onerror: (err) => {
            console.error(err);
            setError('Connection error occurred.');
            setConnectionState(ConnectionState.ERROR);
          }
        }
      });

      sessionRef.current = session;
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to connect');
      setConnectionState(ConnectionState.ERROR);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
        sessionRef.current.close();
    }
    
    // Stop Microphone
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    
    // Stop Audio Contexts
    audioContextRef.current?.close();
    
    // Stop Source Nodes
    sourceNodesRef.current.forEach(node => node.stop());
    sourceNodesRef.current.clear();

    setConnectionState(ConnectionState.DISCONNECTED);
    setMessages([]);
    setIsPaused(false);
    sessionRef.current = null;
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    messages,
    volume,
    error,
    isPaused,
    togglePause
  };
};