import { Panel } from "@/components/ui/panel";
import { ScopeCanvas } from "@/components/studio/scope-canvas";
import { SpectrumCanvas } from "@/components/studio/spectrum-canvas";
import { TunerMeter } from "@/components/studio/tuner-meter";
import { AudioFrameFeature } from "@/types/studio";
import { formatBpm, formatCents, formatHz } from "@/lib/format";

interface AnalysisPanelProps {
  frame: AudioFrameFeature | null;
}

export function AnalysisPanel({ frame }: AnalysisPanelProps) {
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
        <TunerMeter cents={frame?.cents ?? null} />
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
