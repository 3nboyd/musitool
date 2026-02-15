"use client";

import { useEffect, useRef } from "react";

interface SpectrumCanvasProps {
  data: number[];
}

export function SpectrumCanvas({ data }: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);

    const barWidth = width / Math.max(1, data.length);

    for (let i = 0; i < data.length; i += 1) {
      const normalized = Math.max(0, Math.min(1, data[i]));
      const barHeight = normalized * height;
      const x = i * barWidth;
      const y = height - barHeight;

      const gradient = ctx.createLinearGradient(0, y, 0, height);
      gradient.addColorStop(0, "#38bdf8");
      gradient.addColorStop(1, "#1d4ed8");

      ctx.fillStyle = gradient;
      ctx.fillRect(x + 1, y, Math.max(1, barWidth - 2), barHeight);
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={180}
      className="h-36 w-full rounded-lg border border-slate-800 bg-slate-950"
    />
  );
}
