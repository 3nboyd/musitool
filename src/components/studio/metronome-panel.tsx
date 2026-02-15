import { Panel } from "@/components/ui/panel";
import { MetronomePattern, Subdivision } from "@/types/studio";

interface MetronomePanelProps {
  pattern: MetronomePattern;
  running: boolean;
  currentBeat: number;
  liveTempo: number | null;
  tempoDelta: number | null;
  autoSyncTempo: boolean;
  onUpdate: (update: Partial<MetronomePattern>) => void;
  onToggle: () => void;
  onTapTempo: () => void;
  onSyncToLive: () => void;
  onToggleAutoSyncTempo: () => void;
}

const SUBDIVISIONS: Subdivision[] = ["quarter", "eighth", "triplet", "sixteenth"];

export function MetronomePanel({
  pattern,
  running,
  currentBeat,
  liveTempo,
  tempoDelta,
  autoSyncTempo,
  onUpdate,
  onToggle,
  onTapTempo,
  onSyncToLive,
  onToggleAutoSyncTempo,
}: MetronomePanelProps) {
  const toggleAccent = (index: number) => {
    const accents = [...pattern.accents];
    accents[index] = accents[index] ? 0 : 1;
    onUpdate({ accents });
  };

  const updateTop = (top: number) => {
    const nextTop = Math.max(1, Math.min(12, top));
    const accents = new Array(nextTop).fill(0);
    for (let i = 0; i < nextTop; i += 1) {
      accents[i] = pattern.accents[i] ?? (i === 0 ? 1 : 0);
    }

    onUpdate({
      timeSigTop: nextTop,
      accents,
    });
  };

  return (
    <Panel title="Metronome" subtitle="Subdivision, swing, accents, count-in and tap tempo">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">
          BPM
          <input
            type="number"
            min={30}
            max={240}
            value={pattern.bpm}
            onChange={(event) => onUpdate({ bpm: Number(event.target.value) || 120 })}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
          />
        </label>

        <label className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">
          Subdivision
          <select
            value={pattern.subdivision}
            onChange={(event) => onUpdate({ subdivision: event.target.value as Subdivision })}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
          >
            {SUBDIVISIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">
          Time Signature Top
          <input
            type="number"
            min={1}
            max={12}
            value={pattern.timeSigTop}
            onChange={(event) => updateTop(Number(event.target.value) || 4)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
          />
        </label>

        <label className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">
          Swing ({Math.round(pattern.swing * 100)}%)
          <input
            type="range"
            min={0}
            max={0.5}
            step={0.01}
            value={pattern.swing}
            onChange={(event) => onUpdate({ swing: Number(event.target.value) })}
            className="mt-2 w-full"
          />
        </label>

        <label className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300 sm:col-span-2">
          Count In Bars
          <input
            type="number"
            min={0}
            max={4}
            value={pattern.countInBars}
            onChange={(event) => onUpdate({ countInBars: Math.max(0, Math.min(4, Number(event.target.value) || 0)) })}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1"
          />
        </label>
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Accent Pattern</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from({ length: pattern.timeSigTop }).map((_, index) => {
            const active = pattern.accents[index] === 1;
            const highlighted = running && currentBeat === index + 1;
            return (
              <button
                key={`accent-${index}`}
                type="button"
                onClick={() => toggleAccent(index)}
                className={`rounded-md border px-3 py-1 text-sm transition ${
                  active
                    ? "border-cyan-400 bg-cyan-400/20 text-cyan-200"
                    : "border-slate-700 bg-slate-900 text-slate-300"
                } ${highlighted ? "ring-2 ring-emerald-400/70" : ""}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          {running ? "Stop" : "Start"}
        </button>
        <button
          type="button"
          onClick={onTapTempo}
          className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
        >
          Tap Tempo
        </button>
        <button
          type="button"
          onClick={onSyncToLive}
          disabled={liveTempo === null}
          className="rounded-md border border-cyan-500/60 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sync to Live Tempo
        </button>
        <button
          type="button"
          onClick={onToggleAutoSyncTempo}
          className={`rounded-md border px-4 py-2 text-sm font-semibold ${
            autoSyncTempo
              ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
              : "border-slate-700 bg-slate-900 text-slate-200"
          }`}
        >
          {autoSyncTempo ? "Auto Tempo Follow: On" : "Auto Tempo Follow: Off"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric label="Live Tempo" value={liveTempo ? `${Math.round(liveTempo)} BPM` : "--"} />
        <Metric label="Tempo Delta" value={tempoDelta !== null ? `${tempoDelta.toFixed(2)} BPM` : "--"} />
        <Metric label="Timing Status" value={timingStatusLabel(tempoDelta)} />
      </div>
    </Panel>
  );
}

function timingStatusLabel(delta: number | null): string {
  if (delta === null) {
    return "Waiting";
  }

  if (delta <= 0.8) {
    return "In Time";
  }

  if (delta <= 2) {
    return "Near";
  }

  return "Off Grid";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}
