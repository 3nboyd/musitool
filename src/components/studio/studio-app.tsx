"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalysisPanel } from "@/components/studio/analysis-panel";
import { FormSheetPanel } from "@/components/studio/form-sheet-panel";
import { MidiPanel } from "@/components/studio/midi-panel";
import { MetronomePanel } from "@/components/studio/metronome-panel";
import { SessionPanel } from "@/components/studio/session-panel";
import { TheoryPanel } from "@/components/studio/theory-panel";
import { TransportPanel } from "@/components/studio/transport-panel";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";
import { useMetronome } from "@/hooks/useMetronome";
import { useMidi } from "@/hooks/useMidi";
import { useTheoryWorker } from "@/hooks/useTheoryWorker";
import { SessionRecord, deleteSession, listSessions, loadSession, saveSession } from "@/lib/storage/db";
import { quantizeMidiEvents } from "@/lib/midi/quantize";
import { exportChart } from "@/lib/theory/chart-export";
import { useStudioStore } from "@/store/useStudioStore";
import { SessionState, Subdivision } from "@/types/studio";

export function StudioApp() {
  const frame = useStudioStore((state) => state.latestFrame);
  const noteHistory = useStudioStore((state) => state.noteHistory);
  const theoryContext = useStudioStore((state) => state.theoryContext);
  const theoryMemory = useStudioStore((state) => state.theoryMemory);
  const recommendations = useStudioStore((state) => state.recommendations);
  const metronomePattern = useStudioStore((state) => state.metronome);
  const updateMetronome = useStudioStore((state) => state.updateMetronome);
  const sessionName = useStudioStore((state) => state.sessionName);
  const setSessionName = useStudioStore((state) => state.setSessionName);
  const createSessionSnapshot = useStudioStore((state) => state.createSessionSnapshot);
  const applySession = useStudioStore((state) => state.applySession);
  const setTheory = useStudioStore((state) => state.setTheory);
  const analysisSettings = useStudioStore((state) => state.analysisSettings);
  const updateAnalysisSettings = useStudioStore((state) => state.updateAnalysisSettings);
  const source = useStudioStore((state) => state.source);

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
  const [tempoConfidence, setTempoConfidence] = useState<number | null>(null);
  const [autoSyncTempo, setAutoSyncTempo] = useState(false);
  const lastAutoSyncAtRef = useRef(0);
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

  const metronome = useMetronome();
  const toggleMetronome = metronome.toggle;
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
      queueTheoryRequest(noteHistory, metronomePattern.bpm);
    }
  }, [metronomePattern.bpm, noteHistory, queueTheoryRequest, source]);

  useEffect(() => {
    const detectedBpm = frame?.bpm;
    if (detectedBpm === null || detectedBpm === undefined) {
      return;
    }

    const referenceTempo = liveTempo ?? metronomePattern.bpm;
    const normalized = normalizeTempoToReference(detectedBpm, referenceTempo);
    const window = [...liveTempoWindowRef.current, normalized].slice(-20);
    liveTempoWindowRef.current = window;
    setLiveTempo(computeStableTempo(window));
    setTempoConfidence(computeTempoConfidence(window));
  }, [frame?.bpm, liveTempo, metronomePattern.bpm]);

  useEffect(() => {
    if (!autoSyncTempo || liveTempo === null) {
      return;
    }

    if ((tempoConfidence ?? 0) < 0.58) {
      return;
    }

    const now = Date.now();
    const nextBpm = Math.round(liveTempo);
    if (Math.abs(nextBpm - metronomePattern.bpm) >= 1 && now - lastAutoSyncAtRef.current > 1800) {
      updateMetronome({ bpm: nextBpm });
      lastAutoSyncAtRef.current = now;
    }
  }, [autoSyncTempo, liveTempo, metronomePattern.bpm, tempoConfidence, updateMetronome]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        toggleMetronome();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [toggleMetronome]);

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
        queueTheoryRequest(data.noteHistory ?? [], data.lastTheoryContext?.bpm ?? metronomePattern.bpm);
        setNotice(`Imported session \"${data.name}\".`);
      } catch {
        setNotice("Import failed: invalid session JSON.");
      }
    },
    [applySession, metronomePattern.bpm, queueTheoryRequest]
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
      const quantized = quantizeMidiEvents(recordedEvents, {
        bpm: metronomePattern.bpm,
        subdivision,
        strength: 1,
      });

      setRecordedEvents(quantized);
      setNotice(`Quantized phrase to ${subdivision} grid.`);
    },
    [metronomePattern.bpm, recordedEvents, setRecordedEvents]
  );

  const syncToLiveTempo = useCallback(() => {
    if (liveTempo === null) {
      setNotice("Live tempo is not detected yet.");
      return;
    }

    const confidence = tempoConfidence ?? 0;
    if (confidence < 0.45) {
      setNotice("Tempo detection is unstable. Play steady quarter notes, then sync again.");
      return;
    }

    const nextBpm = Math.round(liveTempo);
    updateMetronome({ bpm: nextBpm });
    setNotice(`Metronome locked to ${nextBpm} BPM (${Math.round(confidence * 100)}% confidence).`);
  }, [liveTempo, tempoConfidence, updateMetronome]);

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

  const noticeText = useMemo(() => notice, [notice]);
  const tempoDelta = useMemo(() => {
    if (liveTempo === null) {
      return null;
    }
    return Math.abs(metronomePattern.bpm - liveTempo);
  }, [liveTempo, metronomePattern.bpm]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.12),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(99,102,241,0.14),transparent_40%),linear-gradient(180deg,#020617_0%,#020617_45%,#020617_100%)] px-4 py-6 text-slate-100 md:px-8">
      <main className="mx-auto max-w-7xl space-y-4">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/90">MusiTool</p>
          <h1 className="text-3xl font-semibold tracking-tight">Music Analysis Studio</h1>
          <p className="max-w-4xl text-sm text-slate-300">
            Live audio and MIDI diagnostics for production research: oscilloscope, pitch and tempo analysis,
            theory recommendations, advanced metronome, and phrase capture.
          </p>
          <p className="text-xs text-slate-500">Shortcut: press Space to start/stop metronome.</p>
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
              tunerSettings={analysisSettings.tuner}
              onUpdateTunerSettings={(update) => {
                updateAnalysisSettings({
                  tuner: {
                    ...analysisSettings.tuner,
                    ...update,
                  },
                });
              }}
            />
            <MetronomePanel
              pattern={metronomePattern}
              running={metronome.isRunning}
              currentBeat={metronome.currentBeat}
              liveTempo={liveTempo}
              tempoDelta={tempoDelta}
              tempoConfidence={tempoConfidence}
              autoSyncTempo={autoSyncTempo}
              fileMonitorGain={analysisSettings.fileMonitorGain}
              onUpdate={updateMetronome}
              onUpdateFileMonitorGain={(value) => {
                updateAnalysisSettings({
                  fileMonitorGain: value,
                });
              }}
              onToggle={metronome.toggle}
              onTapTempo={metronome.tapTempo}
              onSyncToLive={syncToLiveTempo}
              onToggleAutoSyncTempo={() => setAutoSyncTempo((value) => !value)}
            />
          </div>

          <div className="space-y-4">
            <TheoryPanel context={theoryContext} recommendations={recommendations} memory={theoryMemory} />
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
            <MidiPanel
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

function computeTempoConfidence(samples: number[]): number | null {
  if (samples.length < 4) {
    return null;
  }

  const avg = samples.reduce((acc, value) => acc + value, 0) / samples.length;
  const variance =
    samples.reduce((acc, value) => acc + (value - avg) * (value - avg), 0) / samples.length;
  const deviation = Math.sqrt(variance);

  return clamp(1 - deviation / 6, 0.1, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
