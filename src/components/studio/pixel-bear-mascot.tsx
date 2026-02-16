import { CSSProperties } from "react";

type PixelBearMode = "sleep" | "chill" | "dance";

interface PixelBearMascotProps {
  mode: PixelBearMode;
  bpm: number | null;
}

export function PixelBearMascot({ mode, bpm }: PixelBearMascotProps) {
  const stepMs = `${Math.round(computeStepMs(bpm, mode))}ms`;

  return (
    <div
      className={`ib-pixel-bear ib-mode-${mode}`}
      style={
        {
          "--ib-step-ms": stepMs,
        } as CSSProperties
      }
      aria-hidden
    >
      <svg viewBox="0 0 96 104" className="ib-pixel-bear-svg" shapeRendering="crispEdges">
        <g className="ib-bear-group">
          <rect x="16" y="8" width="64" height="8" fill="#334155" />
          <rect x="8" y="16" width="10" height="28" fill="#475569" />
          <rect x="78" y="16" width="10" height="28" fill="#475569" />
          <rect x="10" y="18" width="6" height="24" fill="#64748b" />
          <rect x="80" y="18" width="6" height="24" fill="#64748b" />

          <rect x="24" y="16" width="12" height="12" fill="#78350f" />
          <rect x="60" y="16" width="12" height="12" fill="#78350f" />
          <rect x="28" y="20" width="4" height="4" fill="#d97706" />
          <rect x="64" y="20" width="4" height="4" fill="#d97706" />

          <rect x="20" y="24" width="56" height="44" fill="#92400e" />
          <rect x="28" y="36" width="40" height="28" fill="#b45309" />
          <rect x="36" y="42" width="24" height="18" fill="#f59e0b" />

          <rect x="34" y="40" width="6" height="6" fill="#0f172a" />
          <rect x="56" y="40" width="6" height="6" fill="#0f172a" />
          <rect x="36" y="42" width="2" height="2" fill="#e2e8f0" />
          <rect x="58" y="42" width="2" height="2" fill="#e2e8f0" />

          <rect x="46" y="50" width="4" height="4" fill="#1e293b" />
          <rect x="42" y="56" width="12" height="2" fill="#1e293b" />
          <rect x="30" y="50" width="4" height="4" fill="#fb7185" opacity="0.65" />
          <rect x="62" y="50" width="4" height="4" fill="#fb7185" opacity="0.65" />

          <rect x="24" y="66" width="48" height="20" fill="#78350f" />
          <rect x="32" y="70" width="32" height="14" fill="#a16207" />
          <rect x="38" y="74" width="20" height="8" fill="#f59e0b" />

          <rect x="20" y="68" width="8" height="10" fill="#78350f" />
          <rect x="68" y="68" width="8" height="10" fill="#78350f" />
          <rect x="20" y="72" width="8" height="6" fill="#b45309" />
          <rect x="68" y="72" width="8" height="6" fill="#b45309" />
        </g>

        <g className="ib-pixel-leg-left">
          <rect x="34" y="86" width="8" height="14" fill="#78350f" />
          <rect x="32" y="98" width="12" height="4" fill="#d97706" />
          <rect x="34" y="86" width="2" height="14" fill="#92400e" />
        </g>
        <g className="ib-pixel-leg-right">
          <rect x="54" y="86" width="8" height="14" fill="#78350f" />
          <rect x="52" y="98" width="12" height="4" fill="#d97706" />
          <rect x="54" y="86" width="2" height="14" fill="#92400e" />
        </g>

        <rect x="18" y="94" width="60" height="8" rx="4" fill="#6b7280" opacity="0.85" />
      </svg>
      <div className="ib-zzz">z z z</div>
    </div>
  );
}

function computeStepMs(bpm: number | null, mode: PixelBearMode): number {
  if (mode !== "dance") {
    return 1300;
  }
  const safeBpm = clamp(bpm ?? 110, 72, 180);
  return clamp((60000 / safeBpm) * 1.15, 260, 820);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
