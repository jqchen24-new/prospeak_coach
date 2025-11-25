import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number; // 0-1 from input
  isConnected: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isConnected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let baseRadius = 50;

    const draw = () => {
      if (!isConnected) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw idle state
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#334155'; // Slate 700
        ctx.fill();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Dynamic radius based on volume
      // volume is roughly 0-1, we want to scale it up
      const dynamicRadius = baseRadius + (volume * 100);

      // Draw outer glow (User voice / Activity)
      if (volume > 0.01) {
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, dynamicRadius);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.8)'); // Light blue
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, dynamicRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw core (The "AI")
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0ea5e9'; // Sky 500
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#0ea5e9';
      ctx.fill();
      ctx.shadowBlur = 0; // Reset

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [volume, isConnected]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
        {isConnected && (
             <div className="absolute inset-0 rounded-full animate-pulse-ring bg-sky-500/20 pointer-events-none"></div>
        )}
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={300} 
        className="z-10 w-full h-full"
      />
    </div>
  );
};

export default Visualizer;
