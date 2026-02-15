"use client";

import { useEffect, useRef } from "react";

interface ScopeCanvasProps {
  data: number[];
}

export function ScopeCanvas({ data }: ScopeCanvasProps) {
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

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i < data.length; i += 1) {
      const x = (i / Math.max(1, data.length - 1)) * width;
      const y = (0.5 - data[i] * 0.48) * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
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
