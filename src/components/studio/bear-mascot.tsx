interface BearMascotProps {
  pulse: number;
}

export function BearMascot({ pulse }: BearMascotProps) {
  const clamped = clamp(pulse, 0, 1);
  const wrapperTransform = `translateY(${(-1 - clamped * 2.6).toFixed(2)}px) scale(${(
    1 +
    clamped * 0.026
  ).toFixed(3)})`;
  const headTilt = `${(clamped * 1.2).toFixed(2)}deg`;
  const cupLift = `${(clamped * 2.2).toFixed(2)}px`;
  const blink = clamped > 0.88 ? 0.45 : 1;

  return (
    <div className="ib-bear-shell" style={{ transform: wrapperTransform }} aria-hidden>
      <svg viewBox="0 0 200 180" className="h-[112px] w-[128px] drop-shadow-[0_8px_14px_rgba(2,6,23,0.55)]">
        <defs>
          <linearGradient id="ib_fur" x1="62" y1="36" x2="146" y2="142" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#c2410c" />
            <stop offset="1" stopColor="#92400e" />
          </linearGradient>
          <radialGradient id="ib_face" cx="0.5" cy="0.45" r="0.7">
            <stop offset="0" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#d97706" />
          </radialGradient>
          <linearGradient id="ib_headphones" x1="34" y1="76" x2="166" y2="76" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#475569" />
            <stop offset="1" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="ib_cup" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#64748b" />
            <stop offset="1" stopColor="#334155" />
          </linearGradient>
        </defs>

        <path
          d="M56 70C56 44 76 24 102 24C128 24 148 44 148 70"
          fill="none"
          stroke="url(#ib_headphones)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        <g
          style={{
            transform: `translateY(${cupLift})`,
            transformOrigin: "100px 80px",
            transition: "transform 980ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <rect x="34" y="72" width="18" height="44" rx="9" fill="url(#ib_cup)" />
          <rect x="148" y="72" width="18" height="44" rx="9" fill="url(#ib_cup)" />
          <rect x="38" y="76" width="10" height="36" rx="5" fill="#94a3b8" opacity="0.45" />
          <rect x="152" y="76" width="10" height="36" rx="5" fill="#94a3b8" opacity="0.45" />
        </g>

        <g
          style={{
            transform: `rotate(${headTilt})`,
            transformOrigin: "100px 92px",
            transition: "transform 980ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <circle cx="72" cy="72" r="19" fill="#92400e" />
          <circle cx="128" cy="72" r="19" fill="#92400e" />
          <circle cx="72" cy="72" r="8" fill="#d97706" />
          <circle cx="128" cy="72" r="8" fill="#d97706" />

          <ellipse cx="100" cy="94" rx="43" ry="39" fill="url(#ib_fur)" />
          <ellipse cx="100" cy="111" rx="26" ry="20" fill="url(#ib_face)" />

          <ellipse
            cx="85"
            cy="92"
            rx="5.6"
            ry="6"
            fill="#0f172a"
            style={{
              transform: `scaleY(${blink})`,
              transformOrigin: "85px 92px",
              transition: "transform 220ms ease-out",
            }}
          />
          <ellipse
            cx="115"
            cy="92"
            rx="5.6"
            ry="6"
            fill="#0f172a"
            style={{
              transform: `scaleY(${blink})`,
              transformOrigin: "115px 92px",
              transition: "transform 220ms ease-out",
            }}
          />
          <circle cx="87" cy="90" r="1.6" fill="#e2e8f0" />
          <circle cx="117" cy="90" r="1.6" fill="#e2e8f0" />

          <ellipse cx="100" cy="107" rx="6.8" ry="5.8" fill="#1e293b" />
          <path
            d="M89 118C93 124 97 127 100 127C103 127 107 124 111 118"
            stroke="#1e293b"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="78" cy="108" r="3.5" fill="#fb7185" opacity="0.6" />
          <circle cx="122" cy="108" r="3.5" fill="#fb7185" opacity="0.6" />
        </g>

        <ellipse cx="100" cy="144" rx="35" ry="25" fill="#a16207" />
        <ellipse cx="100" cy="149" rx="20" ry="14" fill="#f59e0b" />
        <ellipse cx="72" cy="145" rx="10" ry="8" fill="#92400e" />
        <ellipse cx="128" cy="145" rx="10" ry="8" fill="#92400e" />
        <ellipse cx="72" cy="145" rx="5" ry="4" fill="#f59e0b" />
        <ellipse cx="128" cy="145" rx="5" ry="4" fill="#f59e0b" />
      </svg>

      <div className="ib-bear-legs">
        <div className="ib-bear-leg ib-bear-leg-left">
          <div className="ib-bear-foot" />
        </div>
        <div className="ib-bear-leg ib-bear-leg-right">
          <div className="ib-bear-foot" />
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
