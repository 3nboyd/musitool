import { Panel } from "@/components/ui/panel";
import { ScopeCanvas } from "@/components/studio/scope-canvas";
import { SpectrumCanvas } from "@/components/studio/spectrum-canvas";
import { TunerMeter } from "@/components/studio/tuner-meter";
import { AudioFrameFeature, TunerSettings, TunerTemperament, TunerTolerancePreset } from "@/types/studio";
import { formatBpm, formatCents, formatHz } from "@/lib/format";

interface AnalysisPanelProps {
  frame: AudioFrameFeature | null;
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

export function AnalysisPanel({ frame, tunerSettings, onUpdateTunerSettings }: AnalysisPanelProps) {
  return (
    <Panel title="Signal Lab" subtitle="Live waveform, spectral energy, pitch and timing estimates">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Oscilloscope</p>
          <ScopeCanvas data={frame?.waveform ?? []} />
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Spectrum</p>
          <SpectrumCanvas data={frame?.spectrum ?? []} />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Pitch" value={formatHz(frame?.pitchHz ?? null)} />
        <Metric label="Detected Note" value={frame?.note ?? "--"} />
        <Metric label="BPM" value={formatBpm(frame?.bpm ?? null)} />
        <Metric label="Confidence" value={`${Math.round((frame?.confidence ?? 0) * 100)}%`} />
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Tuner</span>
          <span>{formatCents(frame?.cents ?? null)}</span>
        </div>
        <TunerMeter
          cents={frame?.cents ?? null}
          greenRange={tunerSettings.greenRangeCents}
          yellowRange={tunerSettings.yellowRangeCents}
        />
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
      </div>
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </div>
  );
}
