import { useMemo } from "react";
import { Scale } from "@tonaljs/tonal";
import { Panel } from "@/components/ui/panel";
import { ScopeCanvas } from "@/components/studio/scope-canvas";
import { TunerMeter } from "@/components/studio/tuner-meter";
import {
  AudioFrameFeature,
  TheoryRecommendation,
  TunerSettings,
  TunerTemperament,
  TunerTolerancePreset,
} from "@/types/studio";
import { formatBpm, formatCents, formatHz } from "@/lib/format";

interface AnalysisPanelProps {
  frame: AudioFrameFeature | null;
  frameHistory: AudioFrameFeature[];
  liveTempoBpm: number | null;
  desiredTempoBpm: number | null;
  recommendations: TheoryRecommendation[];
  tunerSettings: TunerSettings;
  onChangeDesiredTempo: (bpm: number | null) => void;
  onUpdateTunerSettings: (update: Partial<TunerSettings>) => void;
}

const TOLERANCE_PROFILES: Record<
  TunerTolerancePreset,
  { label: string; greenRangeCents: number; yellowRangeCents: number }
> = {
  tight: { label: "Tight (+/-3c)", greenRangeCents: 3, yellowRangeCents: 8 },
  standard: { label: "Standard (+/-6c)", greenRangeCents: 6, yellowRangeCents: 14 },
  relaxed: { label: "Relaxed (+/-10c)", greenRangeCents: 10, yellowRangeCents: 20 },
};

const TEMPERAMENT_LABELS: Record<TunerTemperament, string> = {
  equal: "Equal (12-TET)",
  just: "Just (A-referenced)",
  pythagorean: "Pythagorean",
};

const A4_OPTIONS = [432, 438, 440, 442, 444];

export function AnalysisPanel({
  frame,
  frameHistory,
  liveTempoBpm,
  desiredTempoBpm,
  recommendations,
  tunerSettings,
  onChangeDesiredTempo,
  onUpdateTunerSettings,
}: AnalysisPanelProps) {
  const bpmStats = useMemo(
    () => computeBpmStats(frameHistory, desiredTempoBpm, liveTempoBpm),
    [desiredTempoBpm, frameHistory, liveTempoBpm]
  );
  const scaleLanes = useMemo(
    () => recommendations.filter((item) => item.type === "scale").slice(0, 5),
    [recommendations]
  );

  return (
    <Panel
      title="Signal Lab"
      subtitle="Oscilloscope, circular tuner, stable BPM tracking, and improv scale lanes"
    >
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
        <div className="relative">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Oscilloscope + Tuner</p>
          <ScopeCanvas data={frame?.waveform ?? []} />
          <div className="pointer-events-none absolute right-2 top-2 w-[190px] max-w-[48%]">
            <TunerMeter
              cents={frame?.cents ?? null}
              note={frame?.note ?? null}
              greenRange={tunerSettings.greenRangeCents}
              yellowRange={tunerSettings.yellowRangeCents}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Pitch" value={formatHz(frame?.pitchHz ?? null)} />
        <Metric label="Detected Note" value={frame?.note ?? "--"} />
        <Metric label="Detected BPM" value={formatBpm(frame?.bpm ?? null)} />
        <Metric label="Current Drift" value={formatDrift(bpmStats.driftBpm)} />
      </div>

      <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_2fr]">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
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
            <p className="mt-2 text-xs text-slate-400">
              Target used for tempo consistency and drift tracking.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">BPM Consistency</p>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-950">
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

            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Tempo Drift Scale</p>
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
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-slate-300">
          Tolerance
          <select
            value={tunerSettings.tolerancePreset}
            onChange={(event) => {
              const preset = event.target.value as TunerTolerancePreset;
              const profile = TOLERANCE_PROFILES[preset];
              onUpdateTunerSettings({
                tolerancePreset: preset,
                greenRangeCents: profile.greenRangeCents,
                yellowRangeCents: profile.yellowRangeCents,
              });
            }}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          >
            {(Object.keys(TOLERANCE_PROFILES) as TunerTolerancePreset[]).map((preset) => (
              <option key={preset} value={preset}>
                {TOLERANCE_PROFILES[preset].label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-slate-300">
          Temperament
          <select
            value={tunerSettings.temperament}
            onChange={(event) =>
              onUpdateTunerSettings({
                temperament: event.target.value as TunerTemperament,
              })
            }
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          >
            {(Object.keys(TEMPERAMENT_LABELS) as TunerTemperament[]).map((temperament) => (
              <option key={temperament} value={temperament}>
                {TEMPERAMENT_LABELS[temperament]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-slate-300">
          A4 Reference
          <select
            value={tunerSettings.a4Hz}
            onChange={(event) =>
              onUpdateTunerSettings({
                a4Hz: Number(event.target.value) || 440,
              })
            }
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          >
            {A4_OPTIONS.map((hz) => (
              <option key={hz} value={hz}>
                {hz} Hz
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Improv Scale Lanes</p>
        {scaleLanes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            Start audio or MIDI input to build stable scale lanes for this form section.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {scaleLanes.map((lane, index) => (
              <div
                key={`${lane.id}-${index}`}
                className="rounded-lg border border-slate-800 bg-slate-900/70 p-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-100">{lane.label}</span>
                  <span className="text-xs text-slate-400">{Math.round(lane.confidence * 100)}%</span>
                  {notesFromScale(lane.label).map((note) => (
                    <span
                      key={`${lane.id}-${note}`}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-200"
                    >
                      {note}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-400">{lane.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-slate-500">Tuner cents: {formatCents(frame?.cents ?? null)}</div>
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

function formatDrift(drift: number | null): string {
  if (drift === null || !Number.isFinite(drift)) {
    return "--";
  }
  return `${drift.toFixed(2)} BPM`;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function notesFromScale(scaleLabel: string): string[] {
  return Scale.get(scaleLabel).notes.slice(0, 8);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </div>
  );
}
