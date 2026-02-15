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
import { formatHz } from "@/lib/format";

interface AnalysisPanelProps {
  frame: AudioFrameFeature | null;
  recommendations: TheoryRecommendation[];
  tunerSettings: TunerSettings;
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
  recommendations,
  tunerSettings,
  onUpdateTunerSettings,
}: AnalysisPanelProps) {
  const scaleLanes = useMemo(
    () => recommendations.filter((item) => item.type === "scale").slice(0, 6),
    [recommendations]
  );

  return (
    <Panel title="Signal Lab" subtitle="Integrated scope + tuner with improv-ready scale lanes">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Scope + Circular Tuner</p>
          <div className="mx-auto max-w-[360px]">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/70">
              <ScopeCanvas
                data={frame?.waveform ?? []}
                width={420}
                height={420}
                className="h-full w-full border-none bg-transparent"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[66%] max-w-[220px]">
                  <TunerMeter
                    cents={frame?.cents ?? null}
                    note={frame?.note ?? null}
                    greenRange={tunerSettings.greenRangeCents}
                    yellowRange={tunerSettings.yellowRangeCents}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Metric label="Pitch" value={formatHz(frame?.pitchHz ?? null)} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Tuner Calibration</p>
          <div className="mt-2 grid gap-2">
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

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/70 p-2">
            <p className="text-[11px] text-slate-400">
              Green = in tune, yellow = close, red = out. The ring color shifts continuously with pitch error.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
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
    </Panel>
  );
}

function notesFromScale(scaleLabel: string): string[] {
  return Scale.get(scaleLabel).notes.slice(0, 8);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </div>
  );
}
