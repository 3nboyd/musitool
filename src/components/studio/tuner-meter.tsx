interface TunerMeterProps {
  cents: number | null;
  greenRange: number;
  yellowRange: number;
}

export function TunerMeter({ cents, greenRange, yellowRange }: TunerMeterProps) {
  const bounded = cents === null ? 0 : Math.max(-50, Math.min(50, cents));
  const position = ((bounded + 50) / 100) * 100;
  const green = Math.max(1, Math.min(20, greenRange));
  const yellow = Math.max(green + 1, Math.min(30, yellowRange));
  const greenStart = 50 - green;
  const greenEnd = 50 + green;
  const yellowStart = 50 - yellow;
  const yellowEnd = 50 + yellow;
  const absoluteCents = Math.abs(bounded);

  const needleClass =
    cents === null
      ? "bg-slate-300 shadow-[0_0_16px_rgba(203,213,225,0.8)]"
      : absoluteCents <= green
        ? "bg-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.95)]"
        : absoluteCents <= yellow
          ? "bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.95)]"
          : "bg-rose-300 shadow-[0_0_16px_rgba(251,113,133,0.95)]";

  return (
    <div className="space-y-2">
      <div className="relative h-4 rounded-full bg-slate-950 border border-slate-800">
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-rose-500/40" />
        <div
          className="absolute inset-y-0 rounded-full bg-amber-400/55"
          style={{ left: `${yellowStart}%`, right: `${100 - yellowEnd}%` }}
        />
        <div
          className="absolute inset-y-0 rounded-full bg-emerald-400/65"
          style={{ left: `${greenStart}%`, right: `${100 - greenEnd}%` }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-500" />
        <div
          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${needleClass}`}
          style={{ left: `calc(${position}% - 0.375rem)` }}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>-50</span>
        <span>In Tune ({`\u00B1`}{green})</span>
        <span>+50</span>
      </div>
    </div>
  );
}
