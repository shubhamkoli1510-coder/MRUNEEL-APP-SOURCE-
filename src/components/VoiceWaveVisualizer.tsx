import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types/assistant';

interface VoiceWaveVisualizerProps {
  state: AssistantState;
}

export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const isActive = state === 'listening' || state === 'speaking' || state === 'thinking';
      const amplitude = isActive ? (state === 'speaking' ? 22 : 16) : 4;
      const frequency = isActive ? 0.04 : 0.02;

      // Draw 3 layered golden sine wave lines
      const layers = [
        { color: 'rgba(251, 191, 36, 0.85)', lineWidth: 2, speed: 0.08, phaseShift: 0 },
        { color: 'rgba(245, 158, 11, 0.5)', lineWidth: 1.5, speed: -0.05, phaseShift: Math.PI / 4 },
        { color: 'rgba(217, 119, 6, 0.3)', lineWidth: 1, speed: 0.1, phaseShift: Math.PI / 2 }
      ];

      layers.forEach(layer => {
        ctx.beginPath();
        ctx.lineWidth = layer.lineWidth;
        ctx.strokeStyle = layer.color;

        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * frequency + phase * layer.speed + layer.phaseShift) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Draw vertical frequency bars when active
      if (isActive) {
        const barCount = 28;
        const spacing = width / barCount;
        for (let i = 0; i < barCount; i++) {
          const x = i * spacing + spacing / 2;
          const barHeight = Math.abs(Math.sin(phase * 0.1 + i * 0.3)) * (state === 'speaking' ? 20 : 12);
          ctx.fillStyle = 'rgba(251, 191, 36, 0.6)';
          ctx.fillRect(x - 1, (height - barHeight) / 2, 2, barHeight);
        }
      }

      phase += 1;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [state]);

  return (
    <div className="w-full flex items-center justify-center my-1">
      <canvas
        ref={canvasRef}
        width={320}
        height={48}
        className="w-72 h-12 pointer-events-none"
      />
    </div>
  );
};
