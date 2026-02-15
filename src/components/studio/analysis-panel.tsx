import { useMemo, useState } from "react";
import { Scale } from "@tonaljs/tonal";
import { Panel } from "@/components/ui/panel";
import { ScopeCanvas } from "@/components/studio/scope-canvas";
import { TunerMeter } from "@/components/studio/tuner-meter";
import {
  AudioFrameFeature,
  TheoryContext,
  TheoryMemory,
  TheoryRecommendation,
  TunerSettings,
  TunerTemperament,
  TunerTolerancePreset,
} from "@/types/studio";
import { formatHz } from "@/lib/format";

interface AnalysisPanelProps {
  frame: AudioFrameFeature | null;
  theoryContext: TheoryContext;
  theoryMemory: TheoryMemory;
  recommendations: TheoryRecommendation[];
  tunerSettings: TunerSettings;
  onUpdateTunerSettings: (update: Partial<TunerSettings>) => void;
  onSetKeyControlMode: (mode: TheoryMemory["keyControlMode"]) => void;
  onSetAutoDetectKeyChanges: (value: boolean) => void;
  onSetManualKeyScale: (key: string, scale: string) => void;
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
const ROOT_OPTIONS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MANUAL_SCALE_OPTIONS = [
  "major",
  "minor",
  "dorian",
  "mixolydian",
  "lydian",
  "phrygian",
  "locrian",
  "melodic minor",
  "harmonic minor",
];

export function AnalysisPanel({
  frame,
  theoryContext,
  theoryMemory,
  recommendations,
  tunerSettings,
  onUpdateTunerSettings,
  onSetKeyControlMode,
  onSetAutoDetectKeyChanges,
  onSetManualKeyScale,
}: AnalysisPanelProps) {
  const [showTunerSettings, setShowTunerSettings] = useState(false);
  const scaleLanes = useMemo(
    () => recommendations.filter((item) => item.type === "scale").slice(0, 6),
    [recommendations]
  );
  const compactRecommendations = useMemo(
    () => recommendations.filter((item) => item.type !== "scale").slice(0, 6),
    [recommendations]
  );

  return (
    <Panel title="Signal Lab" subtitle="Integrated scope + tuner with improv-ready scale lanes">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Scope + Circular Tuner</p>
          <div className="mx-auto max-w-[360px]">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/70">
              <button
                type="button"
                onClick={() => setShowTunerSettings((value) => !value)}
                className="absolute right-2 top-2 z-20 rounded-md border border-slate-700 bg-slate-900/90 p-1.5 text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
                aria-label="Tuner settings"
                title="Tuner settings"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                  <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.4a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.4a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.4a1 1 0 0 1 1 1v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6Z" />
                </svg>
              </button>
              {showTunerSettings ? (
                <div className="absolute right-2 top-12 z-20 w-64 rounded-lg border border-slate-700 bg-slate-950/95 p-3 shadow-xl shadow-slate-950/60">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Tuner Calibration</p>
                    <button
                      type="button"
                      onClick={() => setShowTunerSettings(false)}
                      className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-slate-500"
                    >
                      close
                    </button>
                  </div>
                  <div className="grid gap-2">
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
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
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
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
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
                        className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs"
                      >
                        {A4_OPTIONS.map((hz) => (
                          <option key={hz} value={hz}>
                            {hz} Hz
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ) : null}
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
              <div className="pointer-events-none absolute bottom-2 right-2 rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-right">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Pitch</p>
                <p className="text-xs font-semibold text-slate-100">{formatHz(frame?.pitchHz ?? null)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Theory Assistant</p>
          <div className="mt-2 grid gap-2">
            <label className="text-xs text-slate-300">
              Detection Mode
              <select
                value={theoryMemory.keyControlMode}
                onChange={(event) =>
                  onSetKeyControlMode(event.target.value as TheoryMemory["keyControlMode"])
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              >
                <option value="auto">Auto-Detect</option>
                <option value="manual">Manual</option>
              </select>
            </label>

            {theoryMemory.keyControlMode === "auto" ? (
              <label className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900/60 px-2 py-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={theoryMemory.autoDetectKeyChanges}
                  onChange={(event) => onSetAutoDetectKeyChanges(event.target.checked)}
                />
                Auto-detect key changes
              </label>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-300">
                  Key
                  <select
                    value={theoryMemory.manualKey}
                    onChange={(event) => onSetManualKeyScale(event.target.value, theoryMemory.manualScale)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  >
                    {ROOT_OPTIONS.map((root) => (
                      <option key={root} value={root}>
                        {root}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-300">
                  Scale
                  <select
                    value={theoryMemory.manualScale}
                    onChange={(event) => onSetManualKeyScale(theoryMemory.manualKey, event.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  >
                    {MANUAL_SCALE_OPTIONS.map((scale) => (
                      <option key={scale} value={scale}>
                        {scale}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <MiniMeta label="Key / Scale" value={`${theoryContext.keyGuess} ${theoryContext.scaleGuess}`} />
            <MiniMeta label="Chord" value={theoryContext.chordGuess} />
            <MiniMeta label="Section" value={theoryContext.formSectionLabel ?? "--"} />
            <MiniMeta
              label="Confidence"
              value={theoryContext.keyConfidence ? `${Math.round(theoryContext.keyConfidence * 100)}%` : "--"}
            />
          </div>

          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Note / Chord Prompts</p>
            {compactRecommendations.length === 0 ? (
              <p className="mt-1 text-xs text-slate-400">Waiting for stable phrase context.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {compactRecommendations.map((item, index) => (
                  <span
                    key={`${item.id}-${index}`}
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-200"
                    title={item.reason}
                  >
                    {item.type}: {item.label}
                  </span>
                ))}
              </div>
            )}
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

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
