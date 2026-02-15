interface BearMascotProps {
  pulse: number;
}

export function BearMascot({ pulse }: BearMascotProps) {
  const clamped = clamp(pulse, 0, 1);
  const wrapperTransform = `translateY(${(-2 - clamped * 4).toFixed(2)}px) scale(${(1 + clamped * 0.045).toFixed(3)})`;
  const earLeft = `rotate(${(-4 - clamped * 6).toFixed(2)}deg)`;
  const earRight = `rotate(${(4 + clamped * 6).toFixed(2)}deg)`;
  const cupOffset = `${(2 + clamped * 3).toFixed(2)}px`;
  const blink = clamped > 0.88 ? 0.3 : 1;
  const smileLift = `${(clamped * 2.8).toFixed(2)}px`;

  return (
    <div
      className="h-[102px] w-[120px] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ transform: wrapperTransform }}
      aria-hidden
    >
      <svg viewBox="0 0 200 170" className="h-full w-full">
        <path
          d="M44 54C44 31 62 16 84 16H116C138 16 156 31 156 54V58"
          fill="none"
          stroke="#1f2937"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <g
          style={{
            transform: earLeft,
            transformOrigin: "64px 46px",
            transition: "transform 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <circle cx="64" cy="46" r="24" fill="#a16207" />
          <circle cx="64" cy="46" r="11" fill="#f59e0b" />
        </g>
        <g
          style={{
            transform: earRight,
            transformOrigin: "136px 46px",
            transition: "transform 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <circle cx="136" cy="46" r="24" fill="#a16207" />
          <circle cx="136" cy="46" r="11" fill="#f59e0b" />
        </g>
        <rect
          x="34"
          y="56"
          width="24"
          height="46"
          rx="12"
          fill="#334155"
          style={{
            transform: `translateY(${cupOffset})`,
            transition: "transform 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        <rect
          x="142"
          y="56"
          width="24"
          height="46"
          rx="12"
          fill="#334155"
          style={{
            transform: `translateY(${cupOffset})`,
            transition: "transform 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        <circle cx="100" cy="92" r="52" fill="#b45309" />
        <ellipse cx="100" cy="114" rx="30" ry="24" fill="#f59e0b" />
        <ellipse
          cx="82"
          cy="88"
          rx="7"
          ry="7"
          fill="#0f172a"
          style={{
            transform: `scaleY(${blink})`,
            transformOrigin: "82px 88px",
            transition: "transform 300ms ease-out",
          }}
        />
        <ellipse
          cx="118"
          cy="88"
          rx="7"
          ry="7"
          fill="#0f172a"
          style={{
            transform: `scaleY(${blink})`,
            transformOrigin: "118px 88px",
            transition: "transform 300ms ease-out",
          }}
        />
        <circle cx="100" cy="108" r="7" fill="#1e293b" />
        <path
          d="M84 122C89 130 95 134 100 134C105 134 111 130 116 122"
          stroke="#1e293b"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          style={{
            transform: `translateY(${-Number.parseFloat(smileLift)}px)`,
            transformOrigin: "100px 128px",
            transition: "transform 900ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
        <circle cx="76" cy="106" r="4" fill="#fb7185" opacity="0.7" />
        <circle cx="124" cy="106" r="4" fill="#fb7185" opacity="0.7" />
      </svg>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
