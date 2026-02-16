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
      <svg viewBox="0 0 48 52" className="ib-pixel-bear-svg" shapeRendering="crispEdges">
        <g className="ib-bear-group">
          <rect x="14" y="6" width="20" height="2" fill="#475569" />
          <rect x="10" y="8" width="4" height="10" fill="#334155" />
          <rect x="34" y="8" width="4" height="10" fill="#334155" />

          <rect x="14" y="8" width="4" height="4" fill="#78350f" />
          <rect x="30" y="8" width="4" height="4" fill="#78350f" />
          <rect x="16" y="10" width="2" height="2" fill="#d97706" />
          <rect x="30" y="10" width="2" height="2" fill="#d97706" />

          <rect x="12" y="12" width="24" height="16" fill="#92400e" />
          <rect x="14" y="14" width="20" height="12" fill="#b45309" />
          <rect x="18" y="16" width="12" height="8" fill="#f59e0b" />

          <rect x="18" y="16" width="2" height="2" fill="#0f172a" />
          <rect x="28" y="16" width="2" height="2" fill="#0f172a" />
          <rect x="19" y="16" width="1" height="1" fill="#e2e8f0" />
          <rect x="29" y="16" width="1" height="1" fill="#e2e8f0" />

          <rect x="23" y="20" width="2" height="2" fill="#1e293b" />
          <rect x="21" y="22" width="6" height="1" fill="#1e293b" />

          <rect x="14" y="24" width="20" height="10" fill="#78350f" />
          <rect x="17" y="26" width="14" height="6" fill="#a16207" />
          <rect x="20" y="27" width="8" height="4" fill="#d97706" />
        </g>

        <g className="ib-pixel-leg-left">
          <rect x="18" y="34" width="3" height="8" fill="#78350f" />
          <rect x="17" y="42" width="5" height="2" fill="#d97706" />
        </g>
        <g className="ib-pixel-leg-right">
          <rect x="27" y="34" width="3" height="8" fill="#78350f" />
          <rect x="26" y="42" width="5" height="2" fill="#d97706" />
        </g>

        <rect x="15" y="45" width="18" height="3" rx="1.5" fill="#9ca3af" />
      </svg>
      <div className="ib-zzz">z z</div>
    </div>
  );
}

function computeStepMs(bpm: number | null, mode: PixelBearMode): number {
  if (mode !== "dance") {
    return 1200;
  }

  const safeBpm = clamp(bpm ?? 110, 72, 180);
  return clamp((60000 / safeBpm) * 1.2, 280, 860);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
