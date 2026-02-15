interface TunerMeterProps {
  cents: number | null;
}

export function TunerMeter({ cents }: TunerMeterProps) {
  const bounded = cents === null ? 0 : Math.max(-50, Math.min(50, cents));
  const position = ((bounded + 50) / 100) * 100;

  return (
    <div className="space-y-2">
      <div className="relative h-4 rounded-full bg-slate-950 border border-slate-800">
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-500" />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.9)]"
          style={{ left: `calc(${position}% - 0.375rem)` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>-50</span>
        <span>In Tune</span>
        <span>+50</span>
      </div>
    </div>
  );
}
