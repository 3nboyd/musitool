import { useMemo } from "react";
import { Panel } from "@/components/ui/panel";
import { buildCircleOfFifths } from "@/lib/theory/recommendations";
import { TheoryContext, TheoryRecommendation } from "@/types/studio";

interface TheoryPanelProps {
  context: TheoryContext;
  recommendations: TheoryRecommendation[];
}

export function TheoryPanel({ context, recommendations }: TheoryPanelProps) {
  const fifths = useMemo(() => buildCircleOfFifths(context.keyGuess), [context.keyGuess]);

  return (
    <Panel title="Theory Assistant" subtitle="Scale and harmony guidance from detected notes">
      <div className="grid gap-3 sm:grid-cols-2">
        <MetaBlock label="Current Note" value={context.note ?? "--"} />
        <MetaBlock label="Key / Scale" value={`${context.keyGuess} ${context.scaleGuess}`} />
        <MetaBlock label="Chord Hypothesis" value={context.chordGuess} />
        <MetaBlock label="Tempo Context" value={context.bpm ? `${context.bpm} BPM` : "--"} />
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Circle of Fifths</p>
        <div className="mt-3 grid grid-cols-6 gap-2 text-sm">
          {fifths.map((note, index) => (
            <div
              key={`${note}-${index}`}
              className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-center text-slate-200"
            >
              {note}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Recommendations</p>
        {recommendations.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-400">
            Start audio or MIDI input to receive note and chord recommendations.
          </p>
        ) : (
          recommendations.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-200">
                  {item.type.toUpperCase()}: {item.label}
                </p>
                <span className="text-xs text-slate-400">{Math.round(item.confidence * 100)}%</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{item.reason}</p>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}
