import { Panel } from "@/components/ui/panel";
import { TheoryFormPattern } from "@/types/studio";

interface FormSheetPanelProps {
  bars: string[];
  patterns: TheoryFormPattern[];
  onChangeBar: (index: number, chord: string) => void;
  onInsertBar: (index: number) => void;
  onRemoveBar: (index: number) => void;
  onDownload: () => void;
}

export function FormSheetPanel({
  bars,
  patterns,
  onChangeBar,
  onInsertBar,
  onRemoveBar,
  onDownload,
}: FormSheetPanelProps) {
  const displayedBars = bars.length > 0 ? bars : ["N.C."];

  return (
    <Panel
      title="Form Sheet"
      subtitle="Editable iReal-style chart generated from learned progression"
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
        >
          Download Chord Sheet
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-[repeating-linear-gradient(180deg,#020617_0px,#020617_20px,#0b1220_20px,#0b1220_21px)] p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {displayedBars.map((bar, index) => {
            const section = sectionLabelForBar(index, displayedBars.length, patterns);

            return (
              <div key={`bar-${index}`} className="rounded-md border border-slate-700 bg-slate-900/80 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    {section ? `${section} · ` : ""}Bar {index + 1}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onInsertBar(index + 1)}
                      className="h-5 w-5 rounded border border-slate-600 text-xs text-slate-200 hover:border-slate-400"
                      title="Add bar"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBar(index)}
                      className="h-5 w-5 rounded border border-slate-600 text-xs text-slate-200 hover:border-slate-400"
                      title="Remove bar"
                    >
                      -
                    </button>
                  </div>
                </div>

                <input
                  value={bar}
                  onChange={(event) => onChangeBar(index, event.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm font-medium text-slate-100"
                  aria-label={`Chord for bar ${index + 1}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {patterns.length > 0 ? (
        <div className="mt-3 text-xs text-slate-400">
          {patterns.slice(0, 4).map((pattern) => (
            <p key={pattern.label}>
              Section {pattern.label}: {pattern.signature.replace(/-/g, " -> ")} ({pattern.occurrences}x)
            </p>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function sectionLabelForBar(index: number, totalBars: number, patterns: TheoryFormPattern[]): string {
  if (patterns.length > 0) {
    const sorted = [...patterns].sort((a, b) => b.length - a.length);
    for (const pattern of sorted) {
      const startIndex = index - (index % pattern.length);
      if (startIndex + pattern.length <= totalBars) {
        return pattern.label;
      }
    }
  }

  const defaultSectionIndex = Math.floor(index / 8);
  return String.fromCharCode(65 + defaultSectionIndex);
}
