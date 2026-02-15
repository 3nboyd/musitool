"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/panel";
import {
  CompressedSection,
  ExpandedToCompressedMapItem,
  FormDisplayMode,
} from "@/types/studio";

type ExportFormat = "txt" | "pdf" | "ireal" | "musicxml";

interface FormSheetPanelProps {
  expandedBars: string[];
  compressedSections: CompressedSection[];
  expandedToCompressedMap: ExpandedToCompressedMapItem[];
  displayMode: FormDisplayMode;
  barsPerPage: number;
  currentExpandedBarIndex: number;
  onSetDisplayMode: (mode: FormDisplayMode) => void;
  onSetBarsPerPage: (bars: number) => void;
  onUpdateExpandedBar: (index: number, chord: string) => void;
  onInsertExpandedBar: (index: number) => void;
  onRemoveExpandedBar: (index: number) => void;
  onUpdateCompressedSectionLabel: (sectionId: string, label: string) => void;
  onUpdateCompressedSectionBars: (sectionId: string, bars: string[]) => void;
  onUnlinkCompressedSectionRepeat: (sectionId: string, repeatIndex: number) => void;
  onDownload: (format: ExportFormat, condensed: boolean) => void;
}

export function FormSheetPanel({
  expandedBars,
  compressedSections,
  expandedToCompressedMap,
  displayMode,
  barsPerPage,
  currentExpandedBarIndex,
  onSetDisplayMode,
  onSetBarsPerPage,
  onUpdateExpandedBar,
  onInsertExpandedBar,
  onRemoveExpandedBar,
  onUpdateCompressedSectionLabel,
  onUpdateCompressedSectionBars,
  onUnlinkCompressedSectionRepeat,
  onDownload,
}: FormSheetPanelProps) {
  const [page, setPage] = useState(0);
  const [condensedExport, setCondensedExport] = useState(false);

  const activeSectionId = expandedToCompressedMap[currentExpandedBarIndex]?.sectionId;

  const compressedPages = useMemo(() => {
    if (compressedSections.length === 0) {
      return [[] as CompressedSection[]];
    }

    const pages: CompressedSection[][] = [];
    let currentPage: CompressedSection[] = [];
    let currentBudget = 0;

    compressedSections.forEach((section) => {
      const sectionEquivalentBars = section.bars.length * section.repeatCount;
      if (currentPage.length > 0 && currentBudget + sectionEquivalentBars > barsPerPage) {
        pages.push(currentPage);
        currentPage = [];
        currentBudget = 0;
      }

      currentPage.push(section);
      currentBudget += sectionEquivalentBars;
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }, [barsPerPage, compressedSections]);

  const expandedPages = useMemo(() => {
    if (expandedBars.length === 0) {
      return [[] as string[]];
    }

    const pages: string[][] = [];
    for (let i = 0; i < expandedBars.length; i += barsPerPage) {
      pages.push(expandedBars.slice(i, i + barsPerPage));
    }

    return pages;
  }, [barsPerPage, expandedBars]);

  const totalPages = displayMode === "compressed" ? compressedPages.length : expandedPages.length;
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const currentCompressed = compressedPages[safePage] ?? [];
  const currentExpanded = expandedPages[safePage] ?? [];
  const pageStartBar = safePage * barsPerPage;

  return (
    <Panel
      title="Form Sheet"
      subtitle="32-bar default performance chart with compressed repeat display and full-form export"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-300">
          Display
          <select
            value={displayMode}
            onChange={(event) => {
              onSetDisplayMode(event.target.value as FormDisplayMode);
              setPage(0);
            }}
            className="ml-2 rounded border border-slate-700 bg-slate-900 px-2 py-1"
          >
            <option value="compressed">Compressed</option>
            <option value="expanded">Expanded</option>
          </select>
        </label>

        <label className="text-xs text-slate-300">
          Bars / Page
          <input
            type="number"
            min={8}
            max={64}
            value={barsPerPage}
            onChange={(event) => {
              onSetBarsPerPage(Number(event.target.value) || 32);
              setPage(0);
            }}
            className="ml-2 w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1"
          />
        </label>

        <label className="flex items-center gap-1 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={condensedExport}
            onChange={(event) => setCondensedExport(event.target.checked)}
          />
          Print condensed with repeat signs
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ExportButton label="TXT" onClick={() => onDownload("txt", condensedExport)} />
        <ExportButton label="PDF" onClick={() => onDownload("pdf", condensedExport)} />
        <ExportButton label="iRealPro" onClick={() => onDownload("ireal", condensedExport)} />
        <ExportButton label="MusicXML" onClick={() => onDownload("musicxml", condensedExport)} />
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
        <button
          type="button"
          onClick={() => setPage((value) => Math.max(0, value - 1))}
          disabled={safePage <= 0}
          className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40"
        >
          Prev Page
        </button>
        <span>
          Page {safePage + 1} / {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
          disabled={safePage >= totalPages - 1}
          className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40"
        >
          Next Page
        </button>
      </div>

      {displayMode === "compressed" ? (
        <div className="mt-4 space-y-3">
          {currentCompressed.length === 0 ? (
            <p className="text-sm text-slate-400">No compressed form available yet.</p>
          ) : (
            currentCompressed.map((section) => {
              const isActive = section.id === activeSectionId;
              return (
                <div
                  key={section.id}
                  className={`rounded-lg border p-3 ${
                    isActive
                      ? "border-cyan-400 bg-cyan-500/10"
                      : "border-slate-800 bg-slate-950/80"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-slate-300">
                      Section
                      <input
                        value={section.label}
                        onChange={(event) =>
                          onUpdateCompressedSectionLabel(section.id, event.target.value)
                        }
                        className="ml-2 w-12 rounded border border-slate-700 bg-slate-900 px-2 py-1"
                      />
                    </label>
                    <span className="text-xs text-slate-400">
                      {section.bars.length} bars x{section.repeatCount}
                    </span>
                  </div>

                  <label className="mt-2 block text-xs text-slate-300">
                    Bars (| separated)
                    <input
                      value={section.bars.join(" | ")}
                      onChange={(event) =>
                        onUpdateCompressedSectionBars(
                          section.id,
                          event.target.value
                            .split("|")
                            .map((item) => item.trim())
                            .filter((item) => item.length > 0)
                        )
                      }
                      className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                    />
                  </label>

                  {section.repeatCount > 1 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.from({ length: section.repeatCount }).map((_, repeatIndex) => (
                        <button
                          key={`${section.id}-unlink-${repeatIndex}`}
                          type="button"
                          onClick={() => onUnlinkCompressedSectionRepeat(section.id, repeatIndex)}
                          className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
                        >
                          Unlink repeat {repeatIndex + 1}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {currentExpanded.length === 0 ? (
            <p className="text-sm text-slate-400">No expanded form available yet.</p>
          ) : (
            currentExpanded.map((bar, index) => {
              const absoluteIndex = pageStartBar + index;
              const active = absoluteIndex === currentExpandedBarIndex;

              return (
                <div
                  key={`expanded-${absoluteIndex}`}
                  className={`rounded border p-2 ${
                    active
                      ? "border-cyan-400 bg-cyan-500/10"
                      : "border-slate-700 bg-slate-950/80"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-slate-400">
                    <span>Bar {absoluteIndex + 1}</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => onInsertExpandedBar(absoluteIndex + 1)}
                        className="h-5 w-5 rounded border border-slate-600 text-xs"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveExpandedBar(absoluteIndex)}
                        className="h-5 w-5 rounded border border-slate-600 text-xs"
                      >
                        -
                      </button>
                    </div>
                  </div>

                  <input
                    value={bar}
                    onChange={(event) => onUpdateExpandedBar(absoluteIndex, event.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  />
                </div>
              );
            })
          )}
        </div>
      )}
    </Panel>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
    >
      {label}
    </button>
  );
}
