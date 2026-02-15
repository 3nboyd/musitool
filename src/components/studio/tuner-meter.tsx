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
  const center = 90;
  const radius = 66;
  const needleX = center + Math.cos(radians) * radius;
  const needleY = center + Math.sin(radians) * radius;
  const meterColor = colorFromError(absolute, green, yellow);

  return (
    <div
      className="rounded-full border p-2 backdrop-blur-sm"
      style={{
        borderColor: `${meterColor}88`,
        backgroundColor: "rgba(2,6,23,0.16)",
      }}
    >
      <div className="relative mx-auto h-[160px] w-[160px]">
        <svg viewBox="0 0 180 180" className="h-full w-full">
          <defs>
            <linearGradient id="tuner-spectrum" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="45%" stopColor="#fbbf24" />
              <stop offset="55%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
          </defs>
          <circle
            cx={center}
            cy={center}
            r="74"
            stroke="url(#tuner-spectrum)"
            strokeWidth="8"
            fill="none"
            opacity="0.55"
          />
          <circle
            cx={center}
            cy={center}
            r="61"
            stroke={meterColor}
            strokeWidth="10"
            fill="none"
            opacity="0.85"
          />
          <line x1={center} y1={center} x2={needleX} y2={needleY} stroke={meterColor} strokeWidth="3" />
          <circle cx={center} cy={center} r="7" fill={meterColor} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold leading-none text-slate-100">{note ?? "--"}</p>
          <p className="mt-1 text-xs text-slate-300">{formatSignedCents(cents)}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
            target {`\u00B1`}{green}c
          </p>
        </div>
      </div>
    </div>
  );
}

function colorFromError(error: number, green: number, yellow: number): string {
  if (!Number.isFinite(error)) {
    return "#cbd5e1";
  }
  if (error <= green) {
    return "#34d399";
  }
  if (error <= yellow) {
    const ratio = (error - green) / Math.max(0.0001, yellow - green);
    return interpolateColor("#34d399", "#fbbf24", ratio);
  }
  const ratio = clamp((error - yellow) / Math.max(0.0001, 50 - yellow), 0, 1);
  return interpolateColor("#fbbf24", "#fb7185", ratio);
}

function interpolateColor(startHex: string, endHex: string, ratio: number): string {
  const from = hexToRgb(startHex);
  const to = hexToRgb(endHex);
  const r = Math.round(from.r + (to.r - from.r) * ratio);
  const g = Math.round(from.g + (to.g - from.g) * ratio);
  const b = Math.round(from.b + (to.b - from.b) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
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
