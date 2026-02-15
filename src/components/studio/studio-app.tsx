"use client";

import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnalysisPanel } from "@/components/studio/analysis-panel";
import { FormSheetPanel } from "@/components/studio/form-sheet-panel";
import { MidiPanel } from "@/components/studio/midi-panel";
import { SessionPanel } from "@/components/studio/session-panel";
import { SpectrumBackdrop } from "@/components/studio/spectrum-backdrop";
import { TempoPanel } from "@/components/studio/tempo-panel";
import { TransportPanel } from "@/components/studio/transport-panel";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useMidi } from "@/hooks/useMidi";
import { useTheoryWorker } from "@/hooks/useTheoryWorker";
import { SessionRecord, deleteSession, listSessions, loadSession, saveSession } from "@/lib/storage/db";
import { quantizeMidiEvents } from "@/lib/midi/quantize";
import { exportChart } from "@/lib/theory/chart-export";
import { useStudioStore } from "@/store/useStudioStore";
import { SessionState, Subdivision } from "@/types/studio";

type RightPanelId = "form" | "tempo";

const DEFAULT_RIGHT_PANEL_ORDER: RightPanelId[] = ["form", "tempo"];

export function StudioApp() {
  const frame = useStudioStore((state) => state.latestFrame);
  const frameHistory = useStudioStore((state) => state.frameHistory);
  const noteHistory = useStudioStore((state) => state.noteHistory);
  const source = useStudioStore((state) => state.source);
  const theoryContext = useStudioStore((state) => state.theoryContext);
  const theoryMemory = useStudioStore((state) => state.theoryMemory);
  const recommendations = useStudioStore((state) => state.recommendations);
  const sessionName = useStudioStore((state) => state.sessionName);
  const setSessionName = useStudioStore((state) => state.setSessionName);
  const createSessionSnapshot = useStudioStore((state) => state.createSessionSnapshot);
  const applySession = useStudioStore((state) => state.applySession);
  const setTheory = useStudioStore((state) => state.setTheory);
  const setTheoryControl = useStudioStore((state) => state.setTheoryControl);
  const analysisSettings = useStudioStore((state) => state.analysisSettings);
  const updateAnalysisSettings = useStudioStore((state) => state.updateAnalysisSettings);

  const midiEvents = useStudioStore((state) => state.midiEvents);
  const recordingMidi = useStudioStore((state) => state.recordingMidi);
  const setRecordingMidi = useStudioStore((state) => state.setRecordingMidi);
  const recordedEvents = useStudioStore((state) => state.recordedEvents);
  const setRecordedEvents = useStudioStore((state) => state.setRecordedEvents);
  const clearRecordedEvents = useStudioStore((state) => state.clearRecordedEvents);
  const updateFormSheetBar = useStudioStore((state) => state.updateFormSheetBar);
  const insertFormSheetBar = useStudioStore((state) => state.insertFormSheetBar);
  const removeFormSheetBar = useStudioStore((state) => state.removeFormSheetBar);
  const updateCompressedSectionLabel = useStudioStore((state) => state.updateCompressedSectionLabel);
  const updateCompressedSectionBars = useStudioStore((state) => state.updateCompressedSectionBars);
  const unlinkCompressedSectionRepeat = useStudioStore((state) => state.unlinkCompressedSectionRepeat);
  const setFormDisplayMode = useStudioStore((state) => state.setFormDisplayMode);
  const setBarsPerPage = useStudioStore((state) => state.setBarsPerPage);

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [liveTempo, setLiveTempo] = useState<number | null>(null);
  const [rightPanelOrder, setRightPanelOrder] = useState<RightPanelId[]>(DEFAULT_RIGHT_PANEL_ORDER);
  const draggingPanelRef = useRef<RightPanelId | null>(null);
  const liveTempoWindowRef = useRef<number[]>([]);

  const { requestTheory } = useTheoryWorker({
    onResponse: ({ context, recommendations: nextRecommendations, memory }) => {
      setTheory(context, nextRecommendations, memory);
    },
  });

  const queueTheoryRequest = useCallback(
    (history: string[], bpm: number | null) => {
      const snapshot = useStudioStore.getState();
      requestTheory({
        noteHistory: history,
        bpm,
        previousContext: snapshot.theoryContext,
        previousMemory: snapshot.theoryMemory,
        nowMs: Date.now(),
      });
    },
    [requestTheory]
  );

  const audio = useAudioAnalysis({
    onTheoryRequest: (history, bpm) => {
      queueTheoryRequest(history, bpm);
    },
    fileMonitorGain: analysisSettings.fileMonitorGain,
    tunerSettings: analysisSettings.tuner,
  });

  const midi = useMidi();

  const refreshSessions = useCallback(async () => {
    try {
      const stored = await listSessions();
      setSessions(stored);
    } catch {
      setNotice("Could not load local sessions.");
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (source === "midi" && noteHistory.length > 0) {
      queueTheoryRequest(noteHistory, analysisSettings.targetTempoBpm ?? liveTempo);
    }
  }, [analysisSettings.targetTempoBpm, liveTempo, noteHistory, queueTheoryRequest, source]);

  useEffect(() => {
    const detectedBpm = frame?.bpm;
    if (detectedBpm === null || detectedBpm === undefined) {
      return;
    }

    const referenceTempo = liveTempo ?? analysisSettings.targetTempoBpm ?? detectedBpm;
    const normalized = normalizeTempoToReference(detectedBpm, referenceTempo);
    const nextWindow = [...liveTempoWindowRef.current, normalized].slice(-20);
    liveTempoWindowRef.current = nextWindow;
    setLiveTempo(computeStableTempo(nextWindow));
  }, [analysisSettings.targetTempoBpm, frame?.bpm, liveTempo]);

  const saveCurrentSession = useCallback(async () => {
    setSaving(true);

    try {
      const snapshot = createSessionSnapshot();
      await saveSession(snapshot);
      await refreshSessions();
      setNotice(`Saved session \"${snapshot.name}\".`);
    } catch {
      setNotice("Session save failed.");
    } finally {
      setSaving(false);
    }
  }, [createSessionSnapshot, refreshSessions]);

  const loadStoredSession = useCallback(
    async (id: string) => {
      try {
        const session = await loadSession(id);
        if (!session) {
          setNotice("Session not found.");
          return;
        }

        applySession(session);
        queueTheoryRequest(session.noteHistory, session.lastTheoryContext.bpm);
        setNotice(`Loaded session \"${session.name}\".`);
      } catch {
        setNotice("Session load failed.");
      }
    },
    [applySession, queueTheoryRequest]
  );

  const removeStoredSession = useCallback(
    async (id: string) => {
      try {
        await deleteSession(id);
        await refreshSessions();
      } catch {
        setNotice("Could not delete session.");
      }
    },
    [refreshSessions]
  );

  const exportSessionJson = useCallback(() => {
    const snapshot = createSessionSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${snapshot.name.replace(/\s+/g, "-").toLowerCase()}-${snapshot.updatedAt}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [createSessionSnapshot]);

  const importSessionJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const data = JSON.parse(text) as SessionState;

        if (!data.id || !data.metronome || !Array.isArray(data.recordedEvents)) {
          throw new Error("Invalid session file");
        }

        applySession(data);
        queueTheoryRequest(
          data.noteHistory ?? [],
          data.lastTheoryContext?.bpm ?? analysisSettings.targetTempoBpm ?? liveTempo
        );
        setNotice(`Imported session \"${data.name}\".`);
      } catch {
        setNotice("Import failed: invalid session JSON.");
      }
    },
    [analysisSettings.targetTempoBpm, applySession, liveTempo, queueTheoryRequest]
  );

  const toggleMidiRecording = useCallback(() => {
    if (recordingMidi) {
      setRecordingMidi(false);
      return;
    }
    setRecordingMidi(true, Date.now());
  }, [recordingMidi, setRecordingMidi]);

  const quantizeRecorded = useCallback(
    (subdivision: Subdivision) => {
      const quantizeBpm = Math.round(analysisSettings.targetTempoBpm ?? liveTempo ?? 100);
      const quantized = quantizeMidiEvents(recordedEvents, {
        bpm: quantizeBpm,
        subdivision,
        strength: 1,
      });

      setRecordedEvents(quantized);
      setNotice(`Quantized phrase to ${subdivision} grid at ${quantizeBpm} BPM.`);
    },
    [analysisSettings.targetTempoBpm, liveTempo, recordedEvents, setRecordedEvents]
  );

  const downloadChartSheet = useCallback(
    async (format: "txt" | "pdf" | "ireal" | "musicxml", condensed: boolean) => {
      if (theoryMemory.expandedBars.length === 0) {
        setNotice("No learned form bars yet to export.");
        return;
      }

      await exportChart(
        {
          name: sessionName,
          keyLabel: `${theoryContext.keyGuess} ${theoryContext.scaleGuess}`,
          expandedBars: theoryMemory.expandedBars,
          compressedSections: theoryMemory.compressedSections,
          condensed,
        },
        format
      );
    },
    [
      sessionName,
      theoryContext.keyGuess,
      theoryContext.scaleGuess,
      theoryMemory.compressedSections,
      theoryMemory.expandedBars,
    ]
  );

  const rightPanels = useMemo<Record<RightPanelId, ReactNode>>(
    () => ({
      form: (
        <FormSheetPanel
          expandedBars={theoryMemory.expandedBars}
          compressedSections={theoryMemory.compressedSections}
          expandedToCompressedMap={theoryMemory.expandedToCompressedMap}
          displayMode={theoryMemory.displayMode}
          barsPerPage={theoryMemory.barsPerPage}
          currentExpandedBarIndex={theoryMemory.currentExpandedBarIndex}
          onSetDisplayMode={setFormDisplayMode}
          onSetBarsPerPage={setBarsPerPage}
          onUpdateExpandedBar={updateFormSheetBar}
          onInsertExpandedBar={insertFormSheetBar}
          onRemoveExpandedBar={removeFormSheetBar}
          onUpdateCompressedSectionLabel={updateCompressedSectionLabel}
          onUpdateCompressedSectionBars={updateCompressedSectionBars}
          onUnlinkCompressedSectionRepeat={unlinkCompressedSectionRepeat}
          onDownload={(format, condensed) => {
            void downloadChartSheet(format, condensed);
          }}
        />
      ),
      tempo: (
        <TempoPanel
          frameHistory={frameHistory}
          liveTempoBpm={liveTempo}
          desiredTempoBpm={analysisSettings.targetTempoBpm}
          onChangeDesiredTempo={(bpm) => {
            updateAnalysisSettings({
              targetTempoBpm: bpm,
            });
          }}
        />
      ),
    }),
    [
      analysisSettings.targetTempoBpm,
      downloadChartSheet,
      frameHistory,
      insertFormSheetBar,
      liveTempo,
      removeFormSheetBar,
      setBarsPerPage,
      setFormDisplayMode,
      theoryMemory,
      updateAnalysisSettings,
      unlinkCompressedSectionRepeat,
      updateCompressedSectionBars,
      updateCompressedSectionLabel,
      updateFormSheetBar,
    ]
  );

  const noticeText = useMemo(() => notice, [notice]);

  return (
    <div className="relative min-h-screen px-4 py-6 text-slate-100 md:px-8">
      <SpectrumBackdrop data={frame?.spectrum ?? []} />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-slate-950/35" />
      <main className="relative z-10 mx-auto max-w-7xl space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/75 p-1.5">
              <Image
                src="/musitone-logo.svg"
                alt="MusiTone logo"
                width={54}
                height={54}
                className="h-[54px] w-[54px]"
                priority
              />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-100">MusiTone</h1>
              <p className="text-sm text-slate-300">Designed by Noah Boyd</p>
            </div>
          </div>
          <a
            href="mailto:noahboydmusic@gmail.com"
            className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200 transition hover:border-cyan-400 hover:bg-cyan-500/20"
          >
            Contact Me
          </a>
        </header>

        <TransportPanel
          source={audio.source}
          isAnalyzing={audio.isRunning}
          analysisError={audio.error}
          onStartMic={() => {
            void audio.startMicrophone();
          }}
          onStop={audio.stop}
          onAnalyzeFile={(file) => {
            void audio.analyzeFile(file);
          }}
        />

        {noticeText ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {noticeText}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            <AnalysisPanel
              frame={frame}
              theoryContext={theoryContext}
              theoryMemory={theoryMemory}
              recommendations={recommendations}
              tunerSettings={analysisSettings.tuner}
              onUpdateTunerSettings={(update) => {
                updateAnalysisSettings({
                  tuner: {
                    ...analysisSettings.tuner,
                    ...update,
                  },
                });
              }}
              onSetKeyControlMode={(mode) => {
                setTheoryControl({
                  keyControlMode: mode,
                });
              }}
              onSetAutoDetectKeyChanges={(value) => {
                setTheoryControl({
                  autoDetectKeyChanges: value,
                });
              }}
              onSetManualKeyScale={(key, scale) => {
                setTheoryControl({
                  manualKey: key,
                  manualScale: scale,
                  keyControlMode: "manual",
                });
              }}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <MidiPanel
                className="min-h-[420px] h-full"
                supported={midi.supported}
                connected={midi.connected}
                connecting={midi.connecting}
                devices={midi.devices}
                events={midiEvents}
                recording={recordingMidi}
                recordedEvents={recordedEvents}
                onConnect={() => {
                  void midi.connect();
                }}
                onDisconnect={midi.disconnect}
                onToggleRecording={toggleMidiRecording}
                onReplay={midi.replayRecorded}
                onClearRecorded={clearRecordedEvents}
                onQuantize={quantizeRecorded}
              />
              <SessionPanel
                className="min-h-[420px] h-full"
                sessionName={sessionName}
                sessions={sessions}
                saving={saving}
                onSessionNameChange={setSessionName}
                onSave={() => {
                  void saveCurrentSession();
                }}
                onRefresh={() => {
                  void refreshSessions();
                }}
                onLoad={(id) => {
                  void loadStoredSession(id);
                }}
                onDelete={(id) => {
                  void removeStoredSession(id);
                }}
                onExportJson={exportSessionJson}
                onImportJson={(file) => {
                  void importSessionJson(file);
                }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="rounded-md border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
              Drag cards to reorder the right column.
            </p>
            {rightPanelOrder.map((panelId) => (
              <div
                key={panelId}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={() => {
                  const sourcePanel = draggingPanelRef.current;
                  if (!sourcePanel || sourcePanel === panelId) {
                    return;
                  }
                  setRightPanelOrder((previous) => reorderPanels(previous, sourcePanel, panelId));
                  draggingPanelRef.current = null;
                }}
                className="rounded-xl border border-transparent transition hover:border-slate-700/80"
              >
                <div className="mb-1 flex items-center justify-between rounded-md border border-slate-800/70 bg-slate-900/70 px-3 py-1">
                  <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                    {rightPanelLabel(panelId)}
                  </span>
                  <span
                    draggable
                    onDragStart={(event) => {
                      draggingPanelRef.current = panelId;
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    className="cursor-grab text-[10px] text-slate-500"
                  >
                    drag
                  </span>
                </div>
                {rightPanels[panelId]}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function normalizeTempoToReference(candidate: number, reference: number): number {
  const options = [candidate, candidate / 2, candidate * 2, candidate * (2 / 3), candidate * 1.5];
  const valid = options.filter((tempo) => Number.isFinite(tempo) && tempo >= 45 && tempo <= 220);
  if (valid.length === 0) {
    return candidate;
  }

  return valid.sort((a, b) => Math.abs(a - reference) - Math.abs(b - reference))[0];
}

function computeStableTempo(samples: number[]): number | null {
  if (samples.length === 0) {
    return null;
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const trim = Math.floor(sorted.length * 0.2);
  const trimmed = sorted.slice(trim, sorted.length - trim);
  const pool = trimmed.length >= 3 ? trimmed : sorted;
  const sum = pool.reduce((acc, value) => acc + value, 0);
  return sum / pool.length;
}

function rightPanelLabel(id: RightPanelId): string {
  switch (id) {
    case "form":
      return "Form Map";
    case "tempo":
      return "Tempo";
    default:
      return id;
  }
}

function reorderPanels(
  panels: RightPanelId[],
  source: RightPanelId,
  target: RightPanelId
): RightPanelId[] {
  const sourceIndex = panels.indexOf(source);
  const targetIndex = panels.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return panels;
  }

  const next = [...panels];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}
