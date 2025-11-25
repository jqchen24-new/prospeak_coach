import React, { useState } from 'react';
import { useLiveAPI } from './hooks/useLiveAPI';
import Visualizer from './components/Visualizer';
import Transcript from './components/Transcript';
import { ConnectionState } from './types';
import { PhoneOff, Play, Pause, Square, Briefcase, Presentation, Coffee, Users } from 'lucide-react';

const CONTEXTS = [
  { id: 'presentation', label: 'Presentation', description: 'Practice your delivery, pacing, and clarity.', icon: Presentation },
  { id: 'interview', label: 'Job Interview', description: 'Practice behavioral, situational, cultural fit, deep-dive, and leadership questions.', icon: Briefcase },
  { id: 'small_talk', label: 'Small Talk', description: 'Casual networking and water cooler chats.', icon: Coffee },
  { id: 'general', label: 'General Work', description: 'Daily standups, meetings, and team collaboration.', icon: Users },
];

const App: React.FC = () => {
  const { 
    connectionState, 
    connect, 
    disconnect, 
    messages, 
    volume, 
    error,
    isPaused,
    togglePause
  } = useLiveAPI();

  const [selectedContext, setSelectedContext] = useState<string>(CONTEXTS[0].label);

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  const handleStart = () => {
    connect(selectedContext);
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans selection:bg-sky-500/30">
      
      {/* Sidebar / Info Panel (Desktop) or Top (Mobile) */}
      <div className="w-full md:w-1/3 border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-sm z-20">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold">
              P
            </div>
            <h1 className="text-xl font-semibold tracking-tight">ProSpeak Coach</h1>
          </div>
          <p className="text-sm text-slate-400">
            Professional communication training powered by Gemini 2.5 Live.
          </p>
        </div>

        {/* Transcript Area */}
        <div className="flex-1 overflow-hidden relative bg-slate-950/30">
           <Transcript messages={messages} />
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 flex flex-col relative">
        {/* Status Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            isConnected && !isPaused ? 'bg-green-500/10 text-green-400' : 
            isConnected && isPaused ? 'bg-yellow-500/10 text-yellow-400' :
            isConnecting ? 'bg-yellow-500/10 text-yellow-400' :
            'bg-slate-800 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isConnected && !isPaused ? 'bg-green-500' : 
              isConnected && isPaused ? 'bg-yellow-500' :
              isConnecting ? 'bg-yellow-500 animate-pulse' :
              'bg-slate-500'
            }`}></span>
            <span>
              {isConnected && !isPaused ? `Live: ${selectedContext}` : 
               isConnected && isPaused ? 'Session Paused' :
               isConnecting ? 'Connecting...' : 
               'Ready'}
            </span>
          </div>
          {error && (
            <div className="px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs border border-red-500/20">
              {error}
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
            {isConnected || isConnecting ? (
                // Connected View (Visualizer)
                <div className="flex flex-col items-center animate-fade-in">
                    <Visualizer volume={volume} isConnected={isConnected && !isPaused} />
                    
                    <div className="mt-12 text-center max-w-md">
                        {isConnecting && (
                            <p className="text-slate-400 animate-pulse">Establishing secure connection...</p>
                        )}
                        {isConnected && !isPaused && (
                            <p className="text-sky-400/80 font-medium">Listening...</p>
                        )}
                        {isConnected && isPaused && (
                            <p className="text-yellow-400/80 font-medium">Session Paused</p>
                        )}
                    </div>
                </div>
            ) : (
                // Setup View (Context Selection)
                <div className="w-full max-w-3xl flex flex-col items-center space-y-8 animate-fade-in">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-white">Choose Your Session</h2>
                        <p className="text-slate-400">Select a context to customize your coaching experience.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        {CONTEXTS.map((ctx) => (
                            <button
                                key={ctx.id}
                                onClick={() => setSelectedContext(ctx.label)}
                                className={`flex items-start p-4 rounded-xl border transition-all duration-200 text-left hover:scale-[1.02] ${
                                    selectedContext === ctx.label 
                                        ? 'bg-sky-500/10 border-sky-500 ring-1 ring-sky-500' 
                                        : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                                }`}
                            >
                                <div className={`p-3 rounded-lg mr-4 ${
                                    selectedContext === ctx.label ? 'bg-sky-500 text-white' : 'bg-slate-700 text-slate-300'
                                }`}>
                                    <ctx.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className={`font-semibold ${selectedContext === ctx.label ? 'text-white' : 'text-slate-200'}`}>
                                        {ctx.label}
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-1">{ctx.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Bottom Controls */}
        <div className="p-8 flex justify-center items-center pb-12 z-20">
            {!isConnected && !isConnecting ? (
                <button
                    onClick={handleStart}
                    className="group relative flex items-center justify-center space-x-2 px-8 py-4 rounded-full bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/30 transition-all hover:scale-105"
                    aria-label="Start Session"
                >
                    <Play className="w-6 h-6 fill-current" />
                    <span className="font-semibold text-lg">Start {selectedContext}</span>
                </button>
            ) : (
                <div className="flex items-center space-x-8">
                    {/* Pause / Resume Button */}
                    <button 
                        onClick={togglePause}
                        className={`p-4 rounded-full transition-all ${
                            isPaused 
                                ? 'bg-sky-500 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/30' 
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                        aria-label={isPaused ? "Resume Session" : "Pause Session"}
                    >
                        {isPaused ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
                    </button>

                    {/* End Session Button */}
                    <button
                        onClick={disconnect}
                        className="flex items-center justify-center w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                        aria-label="End Session"
                    >
                        <Square className="w-6 h-6 fill-current" />
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;