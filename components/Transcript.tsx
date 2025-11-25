import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';

interface TranscriptProps {
  messages: ChatMessage[];
}

const Transcript: React.FC<TranscriptProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
        <p>No conversation yet.</p>
        <p>Start the session to begin coaching.</p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
      {messages.map((msg) => (
        <div 
          key={msg.id} 
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div 
            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-sky-600 text-white rounded-tr-sm' 
                : 'bg-slate-700 text-slate-100 rounded-tl-sm'
            }`}
          >
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Transcript;
