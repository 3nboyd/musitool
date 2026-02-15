interface BearMascotProps {
  pulse: number;
}

export function BearMascot({ pulse }: BearMascotProps) {
  const clamped = clamp(pulse, 0, 1);
  const wrapperTransform = `translateY(${(-3 - clamped * 5).toFixed(2)}px) scale(${(1 + clamped * 0.04).toFixed(3)})`;
  const headTilt = `${(clamped * 1.8).toFixed(2)}deg`;
  const smileLift = `${(clamped * 2.2).toFixed(2)}px`;
  const blink = clamped > 0.86 ? 0.35 : 1;
  const cupLift = `${(clamped * 3).toFixed(2)}px`;
  const bodyBob = `${(clamped * 2).toFixed(2)}px`;

  return (
    <div
      className="h-[188px] w-[176px] transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ transform: wrapperTransform }}
      aria-hidden
    >
      <svg viewBox="0 0 220 240" className="h-full w-full">
        <ellipse cx="110" cy="226" rx="42" ry="8" fill="#0f172a" opacity="0.45" />

        <path
          d="M62 78C62 47 86 22 117 22C148 22 172 47 172 78V82"
          fill="none"
          stroke="#334155"
          strokeWidth="16"
          strokeLinecap="round"
        />

        <g
          style={{
            transform: `translateY(${cupLift})`,
            transition: "transform 1200ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <rect x="46" y="84" width="26" height="62" rx="13" fill="#334155" />
          <rect x="148" y="84" width="26" height="62" rx="13" fill="#334155" />
          <rect x="51" y="89" width="16" height="52" rx="8" fill="#475569" />
          <rect x="153" y="89" width="16" height="52" rx="8" fill="#475569" />
        </g>

        <g
          style={{
            transform: `translateY(${bodyBob})`,
            transition: "transform 1200ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <circle cx="84" cy="88" r="24" fill="#92400e" />
          <circle cx="136" cy="88" r="24" fill="#92400e" />
          <circle cx="84" cy="88" r="10" fill="#d97706" />
          <circle cx="136" cy="88" r="10" fill="#d97706" />

          <g
            style={{
              transform: `rotate(${headTilt})`,
              transformOrigin: "110px 112px",
              transition: "transform 1200ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <circle cx="110" cy="114" r="50" fill="#b45309" />
            <ellipse cx="110" cy="132" rx="30" ry="23" fill="#f59e0b" />

            <ellipse
              cx="92"
              cy="108"
              rx="6.5"
              ry="7"
              fill="#0f172a"
              style={{
                transform: `scaleY(${blink})`,
                transformOrigin: "92px 108px",
                transition: "transform 300ms ease-out",
              }}
            />
            <ellipse
              cx="128"
              cy="108"
              rx="6.5"
              ry="7"
              fill="#0f172a"
              style={{
                transform: `scaleY(${blink})`,
                transformOrigin: "128px 108px",
                transition: "transform 300ms ease-out",
              }}
            />
            <circle cx="95" cy="105" r="2" fill="#e2e8f0" />
            <circle cx="131" cy="105" r="2" fill="#e2e8f0" />

            <ellipse cx="110" cy="128" rx="7.5" ry="6.5" fill="#1e293b" />
            <path
              d="M95 141C99 149 105 153 110 153C115 153 121 149 125 141"
              stroke="#1e293b"
              strokeWidth="4.4"
              strokeLinecap="round"
              fill="none"
              style={{
                transform: `translateY(${-Number.parseFloat(smileLift)}px)`,
                transformOrigin: "110px 147px",
                transition: "transform 1200ms cubic-bezier(0.22,1,0.36,1)",
              }}
            />
            <circle cx="85" cy="129" r="4.2" fill="#fb7185" opacity="0.7" />
            <circle cx="135" cy="129" r="4.2" fill="#fb7185" opacity="0.7" />
          </g>

          <ellipse cx="110" cy="176" rx="40" ry="34" fill="#a16207" />
          <ellipse cx="110" cy="183" rx="25" ry="20" fill="#f59e0b" />

          <ellipse cx="76" cy="176" rx="12" ry="10" fill="#92400e" />
          <ellipse cx="144" cy="176" rx="12" ry="10" fill="#92400e" />
          <ellipse cx="76" cy="176" rx="6" ry="5" fill="#f59e0b" />
          <ellipse cx="144" cy="176" rx="6" ry="5" fill="#f59e0b" />
        </g>

        <g
          className="ib-bear-leg-left"
          style={{ transformOrigin: "92px 186px" }}
        >
          <rect x="82" y="182" width="20" height="42" rx="10" fill="#92400e" />
          <ellipse cx="92" cy="226" rx="12" ry="8" fill="#f59e0b" />
        </g>
        <g
          className="ib-bear-leg-right"
          style={{ transformOrigin: "128px 186px" }}
        >
          <rect x="118" y="182" width="20" height="42" rx="10" fill="#92400e" />
          <ellipse cx="128" cy="226" rx="12" ry="8" fill="#f59e0b" />
        </g>
      </svg>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
