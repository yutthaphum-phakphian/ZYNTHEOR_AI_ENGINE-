// @ts-nocheck
import React, { useEffect, useState } from 'react';

interface AudioWaveformVisualizerProps {
  isListening: boolean;
  barCount?: number;
  height?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export function AudioWaveformVisualizer({
  isListening,
  barCount = 12,
  height = 24,
  primaryColor = '#f43f5e', // rose-500
  secondaryColor = '#00D9A3', // zyntheor teal
}: AudioWaveformVisualizerProps) {
  const [heights, setHeights] = useState<number[]>(() => new Array(barCount).fill(20));

  useEffect(() => {
    if (!isListening) {
      setHeights(new Array(barCount).fill(15));
      return;
    }

    const interval = setInterval(() => {
      // Simulate real-time audio input frequency spectrum heights (15% to 100%)
      setHeights(
        Array.from({ length: barCount }, (_, i) => {
          const baseJitter = Math.sin(Date.now() / 150 + i * 0.8) * 35;
          const randomJitter = Math.random() * 45;
          return Math.min(100, Math.max(15, 30 + baseJitter + randomJitter));
        })
      );
    }, 80);

    return () => clearInterval(interval);
  }, [isListening, barCount]);

  if (!isListening) return null;

  return (
    <div
      className="flex items-end justify-center gap-[3px] py-1 px-2.5 rounded-lg bg-rose-950/30 border border-rose-500/20 shadow-inner select-none overflow-hidden"
      style={{ height: `${height + 8}px` }}
      title="Live Audio Input Strength & Voice Activity Spectrum"
    >
      {heights.map((barHeight, idx) => {
        const isTeal = idx % 3 === 0;
        const color = isTeal ? secondaryColor : primaryColor;

        return (
          <div
            key={idx}
            className="w-[3px] rounded-full transition-all duration-75 ease-out"
            style={{
              height: `${(barHeight / 100) * height}px`,
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}80`,
              opacity: 0.85 + (barHeight / 100) * 0.15,
            }}
          />
        );
      })}
    </div>
  );
}
