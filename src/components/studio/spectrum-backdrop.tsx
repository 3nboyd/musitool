"use client";

import { useEffect, useRef } from "react";

interface SpectrumBackdropProps {
  data: number[];
}

export function SpectrumBackdrop({ data }: SpectrumBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<number[]>(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frame = 0;
    let raf = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      frame += 1;

      context.clearRect(0, 0, width, height);

      const ambient = context.createRadialGradient(
        width * 0.2,
        height * 0.15,
        20,
        width * 0.3,
        height * 0.3,
        width * 0.7
      );
      ambient.addColorStop(0, "rgba(34,211,238,0.22)");
      ambient.addColorStop(0.5, "rgba(14,165,233,0.1)");
      ambient.addColorStop(1, "rgba(2,6,23,0)");
      context.fillStyle = ambient;
      context.fillRect(0, 0, width, height);

      const bars = dataRef.current.length > 0 ? dataRef.current : new Array(64).fill(0);
      const barWidth = width / bars.length;

      context.save();
      context.globalAlpha = 0.62;
      for (let i = 0; i < bars.length; i += 1) {
        const value = clamp(bars[i], 0, 1);
        const wobble = Math.sin((frame + i * 8) * 0.02) * 12;
        const intensity = value * (height * 0.36) + wobble + 18;
        const x = i * barWidth;
        const gradient = context.createLinearGradient(0, height, 0, height - intensity);
        gradient.addColorStop(0, "rgba(15,23,42,0)");
        gradient.addColorStop(1, "rgba(56,189,248,0.68)");
        context.fillStyle = gradient;
        context.fillRect(x, height - intensity, Math.max(2, barWidth * 0.72), intensity);
      }
      context.restore();

      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-95"
      aria-hidden
    />
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
