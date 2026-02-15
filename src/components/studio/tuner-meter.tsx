interface TunerMeterProps {
  cents: number | null;
  greenRange: number;
  yellowRange: number;
  note: string | null;
}

export function TunerMeter({ cents, greenRange, yellowRange, note }: TunerMeterProps) {
  const bounded = cents === null ? 0 : clamp(cents, -50, 50);
  const green = Math.max(1, Math.min(20, greenRange));
  const yellow = Math.max(green + 1, Math.min(30, yellowRange));
  const absolute = Math.abs(bounded);
  const ratio = (bounded + 50) / 100;
  const angle = -140 + ratio * 280;
  const radians = (angle * Math.PI) / 180;
  const center = 88;
  const radius = 70;
  const needleX = center + Math.cos(radians) * radius;
  const needleY = center + Math.sin(radians) * radius;

  const statusClass =
    cents === null
      ? "border-slate-300 text-slate-200"
      : absolute <= green
        ? "border-emerald-300 text-emerald-200"
        : absolute <= yellow
          ? "border-amber-300 text-amber-200"
          : "border-rose-300 text-rose-200";

  const needleColor =
    cents === null
      ? "#cbd5e1"
      : absolute <= green
        ? "#34d399"
        : absolute <= yellow
          ? "#fbbf24"
          : "#fb7185";

  return (
    <div className={`rounded-2xl border bg-slate-950/85 p-2 backdrop-blur ${statusClass}`}>
      <div className="relative mx-auto h-[176px] w-[176px]">
        <svg viewBox="0 0 176 176" className="h-full w-full">
          <path
            d="M 24 128 A 64 64 0 0 1 152 128"
            stroke="rgba(244,63,94,0.65)"
            strokeWidth="13"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 42 128 A 46 46 0 0 1 134 128"
            stroke="rgba(251,191,36,0.8)"
            strokeWidth="11"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 63 128 A 25 25 0 0 1 113 128"
            stroke="rgba(52,211,153,0.85)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
          />
          <line x1={center} y1={center} x2={needleX} y2={needleY} stroke={needleColor} strokeWidth="3" />
          <circle cx={center} cy={center} r="7" fill={needleColor} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold leading-none text-slate-100">{note ?? "--"}</p>
          <p className="mt-1 text-xs text-slate-400">{formatSignedCents(cents)}</p>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between px-2 text-[11px] text-slate-400">
        <span>Flat -50</span>
        <span>Target {`\u00B1`}{green}c</span>
        <span>Sharp +50</span>
      </div>
    </div>
  );
}

function formatSignedCents(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) {
    return "No pitch";
  }
  const rounded = Math.round(cents * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded} cents`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
