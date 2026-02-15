import { useMemo } from "react";
import { Panel } from "@/components/ui/panel";
import { buildCircleOfFifths } from "@/lib/theory/recommendations";
import { TheoryContext, TheoryMemory, TheoryRecommendation } from "@/types/studio";

interface TheoryPanelProps {
  context: TheoryContext;
  recommendations: TheoryRecommendation[];
  memory: TheoryMemory;
  onSetKeyControlMode: (mode: TheoryMemory["keyControlMode"]) => void;
  onSetAutoDetectKeyChanges: (value: boolean) => void;
  onSetManualKeyScale: (key: string, scale: string) => void;
}

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

export function TheoryPanel({
  context,
  recommendations,
  memory,
  onSetKeyControlMode,
  onSetAutoDetectKeyChanges,
  onSetManualKeyScale,
}: TheoryPanelProps) {
  const fifths = useMemo(() => buildCircleOfFifths(context.keyGuess), [context.keyGuess]);
  const progression = memory.progression.slice(-8);
  const formPatterns = memory.formPatterns.slice(0, 4);
  const compactRecommendations = useMemo(
    () => recommendations.filter((item) => item.type !== "scale").slice(0, 6),
    [recommendations]
  );

  return (
    <Panel title="Theory Assistant" subtitle="Scale and harmony guidance from detected notes">
      <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Key Control</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-300">
            Mode
            <select
              value={memory.keyControlMode}
              onChange={(event) =>
                onSetKeyControlMode(event.target.value as TheoryMemory["keyControlMode"])
              }
              className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
            >
              <option value="auto">Auto-Detect</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          {memory.keyControlMode === "auto" ? (
            <label className="flex items-end gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={memory.autoDetectKeyChanges}
                onChange={(event) => onSetAutoDetectKeyChanges(event.target.checked)}
              />
              Auto-detect key changes
            </label>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-300">
                Key
                <select
                  value={memory.manualKey}
                  onChange={(event) => onSetManualKeyScale(event.target.value, memory.manualScale)}
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
                  value={memory.manualScale}
                  onChange={(event) => onSetManualKeyScale(memory.manualKey, event.target.value)}
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
      </div>

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
