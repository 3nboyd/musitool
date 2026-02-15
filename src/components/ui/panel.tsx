import { ReactNode } from "react";
import { clsx } from "clsx";

interface PanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, subtitle, children, className }: PanelProps) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-[0_20px_80px_-40px_rgba(26,64,152,0.65)]",
        className
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}
