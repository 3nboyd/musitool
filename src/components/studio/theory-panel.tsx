import { useMemo } from "react";
import { Scale } from "@tonaljs/tonal";
import { Panel } from "@/components/ui/panel";
import { buildCircleOfFifths } from "@/lib/theory/recommendations";
import { TheoryContext, TheoryMemory, TheoryRecommendation } from "@/types/studio";

interface TheoryPanelProps {
  context: TheoryContext;
  recommendations: TheoryRecommendation[];
  memory: TheoryMemory;
}

export function TheoryPanel({ context, recommendations, memory }: TheoryPanelProps) {
  const fifths = useMemo(() => buildCircleOfFifths(context.keyGuess), [context.keyGuess]);
  const progression = memory.progression.slice(-8);
  const formPatterns = memory.formPatterns.slice(0, 4);
  const scaleRecommendations = useMemo(
    () => recommendations.filter((item) => item.type === "scale"),
    [recommendations]
  );
  const compactRecommendations = useMemo(
    () => recommendations.filter((item) => item.type !== "scale").slice(0, 6),
    [recommendations]
  );

  return (
    <Panel title="Theory Assistant" subtitle="Scale and harmony guidance from detected notes">
      <div className="grid gap-3 sm:grid-cols-2">
        <MetaBlock label="Current Note" value={context.note ?? "--"} />
        <MetaBlock label="Key / Scale" value={`${context.keyGuess} ${context.scaleGuess}`} />
        <MetaBlock label="Chord Hypothesis" value={context.chordGuess} />
        <MetaBlock
          label="Key Confidence"
          value={context.keyConfidence ? `${Math.round(context.keyConfidence * 100)}%` : "--"}
        />
        <MetaBlock label="Form Section" value={context.formSectionLabel ?? "--"} />
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

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Learned Progression (Recent)</p>
        {progression.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">No stable progression learned yet.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {progression.map((chord, index) => (
              <span
                key={`${chord}-${index}`}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200"
              >
                {chord}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Form Map</p>
        {formPatterns.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            Repeat sections will appear here as the song cycles.
          </p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {formPatterns.map((pattern) => (
              <li
                key={pattern.label}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1"
              >
                {pattern.label}: {pattern.signature.replace(/-/g, " -> ")} ({pattern.occurrences}x)
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Improv Scale Lanes</p>
        {scaleRecommendations.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-400">
            Start audio or MIDI input to receive note and chord recommendations.
          </p>
        ) : (
          scaleRecommendations.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="rounded-lg border border-slate-800 bg-slate-950/80 p-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-200">{item.label}</p>
                <span className="text-xs text-slate-400">{Math.round(item.confidence * 100)}%</span>
                {notesFromScale(item.label).map((note) => (
                  <span
                    key={`${item.id}-${note}`}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-200"
                  >
                    {note}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">{item.reason}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-500">Note / Chord Suggestions</p>
        {compactRecommendations.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-400">
            Waiting for stable phrase context.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 text-sm">
            {compactRecommendations.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200"
                title={item.reason}
              >
                {item.type}: {item.label}
              </div>
            ))}
          </div>
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

function notesFromScale(scaleLabel: string): string[] {
  const notes = Scale.get(scaleLabel).notes;
  return notes.slice(0, 8);
}
