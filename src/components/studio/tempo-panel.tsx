import { Panel } from "@/components/ui/panel";
import { AudioFrameFeature } from "@/types/studio";
import { formatBpm } from "@/lib/format";

interface TempoPanelProps {
  frameHistory: AudioFrameFeature[];
  liveTempoBpm: number | null;
  desiredTempoBpm: number | null;
  onChangeDesiredTempo: (bpm: number | null) => void;
}

export function TempoPanel({
  frameHistory,
  liveTempoBpm,
  desiredTempoBpm,
  onChangeDesiredTempo,
}: TempoPanelProps) {
  const bpmStats = computeBpmStats(frameHistory, desiredTempoBpm, liveTempoBpm);

  return (
    <Panel title="Tempo Coach" subtitle="Target BPM and consistency drift monitor">
      <label className="text-xs uppercase tracking-wide text-slate-400">
        Desired Tempo
        <input
          type="number"
          min={30}
          max={260}
          value={desiredTempoBpm ?? ""}
          onChange={(event) => {
            const next = event.target.value.trim();
            if (!next) {
              onChangeDesiredTempo(null);
              return;
            }
            const bpm = Number(next);
            onChangeDesiredTempo(Number.isFinite(bpm) ? bpm : null);
          }}
          className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100"
        />
      </label>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">BPM Consistency</p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-900">
          <div
            className={`h-full rounded-full transition-all ${
              (bpmStats.consistency ?? 0) >= 0.8
                ? "bg-emerald-400"
                : (bpmStats.consistency ?? 0) >= 0.6
                  ? "bg-amber-400"
                  : "bg-rose-400"
            }`}
            style={{ width: `${Math.round((bpmStats.consistency ?? 0) * 100)}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Target: {formatBpm(bpmStats.targetBpm)}</span>
          <span>{bpmStats.consistency !== null ? `${Math.round(bpmStats.consistency * 100)}% stable` : "--"}</span>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Drift Scale</p>
        <div className="relative mt-2 h-4 rounded-full bg-slate-900">
          <div className="absolute inset-y-0 left-1/2 w-px bg-slate-500" />
          <div
            className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${
              (bpmStats.driftBpm ?? 0) <= 1
                ? "bg-emerald-300"
                : (bpmStats.driftBpm ?? 0) <= 2.5
                  ? "bg-amber-300"
                  : "bg-rose-300"
            }`}
            style={{ left: `calc(${driftToPercent(bpmStats.driftSigned)}% - 0.375rem)` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
          <span>-8 BPM</span>
          <span>0</span>
          <span>+8 BPM</span>
        </div>
      </div>
    </Panel>
  );
}

function computeBpmStats(
  frameHistory: AudioFrameFeature[],
  desiredTempoBpm: number | null,
  liveTempoBpm: number | null
): {
  targetBpm: number | null;
  driftBpm: number | null;
  driftSigned: number;
  consistency: number | null;
} {
  const bpmSamples = frameHistory
    .map((frame) => frame.bpm)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .slice(-32);

  const targetBpm = desiredTempoBpm ?? liveTempoBpm ?? (bpmSamples.length > 0 ? average(bpmSamples) : null);
  if (!targetBpm || bpmSamples.length === 0) {
    return {
      targetBpm,
      driftBpm: null,
      driftSigned: 0,
      consistency: null,
    };
  }

  const current = bpmSamples[bpmSamples.length - 1];
  const driftSigned = current - targetBpm;
  const driftBpm = Math.abs(driftSigned);
  const meanAbsDeviation = average(bpmSamples.map((sample) => Math.abs(sample - targetBpm)));
  const consistency = clamp(1 - meanAbsDeviation / 6, 0, 1);

  return {
    targetBpm,
    driftBpm,
    driftSigned,
    consistency,
  };
}

function driftToPercent(drift: number): number {
  const bounded = clamp(drift, -8, 8);
  return ((bounded + 8) / 16) * 100;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
