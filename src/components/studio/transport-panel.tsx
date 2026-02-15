import { AnalysisSource } from "@/types/studio";

interface TransportPanelProps {
  source: AnalysisSource;
  isAnalyzing: boolean;
  analysisError: string | null;
  onStartMic: () => void;
  onStop: () => void;
  onAnalyzeFile: (file: File) => void;
}

export function TransportPanel({
  source,
  isAnalyzing,
  analysisError,
  onStartMic,
  onStop,
  onAnalyzeFile,
}: TransportPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4 shadow-[0_20px_80px_-40px_rgba(26,64,152,0.65)]">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onStartMic}
          className="rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Analyze Microphone
        </button>
        <label className="cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:border-slate-500">
          Analyze Audio File
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onAnalyzeFile(file);
              }
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={onStop}
          className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:border-slate-500"
        >
          Stop
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <p className="text-slate-300">
          Source: <span className="font-semibold text-slate-100">{source}</span>
        </p>
        <p className="text-slate-300">
          Status: <span className="font-semibold text-slate-100">{isAnalyzing ? "Running" : "Idle"}</span>
        </p>
      </div>

      {analysisError ? <p className="mt-2 text-sm text-rose-300">{analysisError}</p> : null}
    </section>
  );
}
