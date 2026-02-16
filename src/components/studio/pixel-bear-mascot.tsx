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
      <svg viewBox="0 0 48 54" className="ib-pixel-bear-svg" shapeRendering="crispEdges">
        <g className="ib-bear-group">
          <rect x="15" y="7" width="18" height="2" fill="#475569" />
          <rect x="12" y="9" width="3" height="9" fill="#334155" />
          <rect x="33" y="9" width="3" height="9" fill="#334155" />

          <rect x="15" y="9" width="3" height="4" fill="#78350f" />
          <rect x="29" y="9" width="3" height="4" fill="#78350f" />
          <rect x="16" y="11" width="2" height="2" fill="#d97706" />
          <rect x="29" y="11" width="2" height="2" fill="#d97706" />

          <rect x="13" y="13" width="22" height="15" fill="#92400e" />
          <rect x="15" y="15" width="18" height="11" fill="#b45309" />
          <rect x="18" y="17" width="12" height="7" fill="#f59e0b" />

          <rect x="18" y="17" width="2" height="2" fill="#0f172a" />
          <rect x="28" y="17" width="2" height="2" fill="#0f172a" />
          <rect x="19" y="17" width="1" height="1" fill="#e2e8f0" />
          <rect x="29" y="17" width="1" height="1" fill="#e2e8f0" />

          <rect x="23" y="21" width="2" height="2" fill="#1e293b" />
          <rect x="21" y="23" width="6" height="1" fill="#1e293b" />

          <rect x="15" y="27" width="18" height="9" fill="#78350f" />
          <rect x="18" y="29" width="12" height="5" fill="#a16207" />
          <rect x="20" y="30" width="8" height="3" fill="#d97706" />
        </g>

        <g className="ib-pixel-leg-left">
          <rect x="19" y="36" width="4" height="8" fill="#78350f" />
          <rect x="18" y="44" width="6" height="2" fill="#d97706" />
        </g>
        <g className="ib-pixel-leg-right">
          <rect x="25" y="36" width="4" height="8" fill="#78350f" />
          <rect x="24" y="44" width="6" height="2" fill="#d97706" />
        </g>

        <rect x="14" y="48" width="20" height="3" rx="1.5" fill="#9ca3af" />
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
