import { create } from "zustand";
import {
  AnalysisSource,
  AnalysisSettings,
  AudioFrameFeature,
  CompressedSection,
  FormDisplayMode,
  MetronomePattern,
  MidiDeviceInfo,
  MidiEvent,
  RecordedMidiEvent,
  SessionState,
  TheoryContext,
  TheoryMemory,
  TheoryRecommendation,
} from "@/types/studio";
import { normalizeAccents } from "@/lib/metronome/math";
import { createDefaultTheoryContext, createDefaultTheoryMemory } from "@/lib/theory/defaults";
import {
  compressExpandedBars,
  expandCompressedSections,
  mergeExpandedBars,
  unlinkRepeatInstance,
} from "@/lib/theory/form-compression";

const NOTE_HISTORY_LIMIT = 64;
const FRAME_HISTORY_LIMIT = 120;

const defaultMetronome: MetronomePattern = {
  bpm: 120,
  timeSigTop: 4,
  timeSigBottom: 4,
  subdivision: "eighth",
  swing: 0,
  accents: [1, 0, 0, 0],
  countInBars: 1,
  volume: 0.75,
  sound: "click",
};

const defaultTheoryContext: TheoryContext = createDefaultTheoryContext();
const defaultTheoryMemory: TheoryMemory = createDefaultTheoryMemory();
const defaultAnalysisSettings: AnalysisSettings = {
  fftSize: 2048,
  smoothingTimeConstant: 0.85,
  fileMonitorGain: 0.85,
  targetTempoBpm: 100,
  tuner: {
    tolerancePreset: "standard",
    greenRangeCents: 6,
    yellowRangeCents: 14,
    temperament: "equal",
    a4Hz: 440,
  },
};

interface StudioState {
  source: AnalysisSource;
  latestFrame: AudioFrameFeature | null;
  frameHistory: AudioFrameFeature[];
  noteHistory: string[];
  theoryContext: TheoryContext;
  theoryMemory: TheoryMemory;
  recommendations: TheoryRecommendation[];
  metronome: MetronomePattern;
  metronomeRunning: boolean;
  midiSupported: boolean;
  midiDevices: MidiDeviceInfo[];
  midiEvents: MidiEvent[];
  recordingMidi: boolean;
  recordedEvents: RecordedMidiEvent[];
  recordingStartMs: number | null;
  sessionName: string;
  analysisSettings: AnalysisSettings;
  midiMap: Record<string, string>;
  setSource: (source: AnalysisSource) => void;
  setLatestFrame: (frame: AudioFrameFeature) => void;
  appendNote: (note: string) => void;
  setTheory: (
    context: TheoryContext,
    recommendations: TheoryRecommendation[],
    memory: TheoryMemory
  ) => void;
  updateAnalysisSettings: (update: Partial<AnalysisSettings>) => void;
  updateMetronome: (update: Partial<MetronomePattern>) => void;
  setMetronomeRunning: (running: boolean) => void;
  setMidiSupported: (supported: boolean) => void;
  setMidiDevices: (devices: MidiDeviceInfo[]) => void;
  addMidiEvent: (event: MidiEvent) => void;
  clearMidiEvents: () => void;
  setRecordingMidi: (recording: boolean, startMs?: number) => void;
  recordMidiEvent: (event: MidiEvent) => void;
  setRecordedEvents: (events: RecordedMidiEvent[]) => void;
  clearRecordedEvents: () => void;
  updateFormSheetBar: (index: number, chord: string) => void;
  insertFormSheetBar: (index: number) => void;
  removeFormSheetBar: (index: number) => void;
  updateCompressedSectionLabel: (sectionId: string, label: string) => void;
  updateCompressedSectionBars: (sectionId: string, bars: string[]) => void;
  unlinkCompressedSectionRepeat: (sectionId: string, repeatIndex: number) => void;
  setFormDisplayMode: (mode: FormDisplayMode) => void;
  setBarsPerPage: (bars: number) => void;
  setSessionName: (name: string) => void;
  applySession: (session: SessionState) => void;
  createSessionSnapshot: () => SessionState;
}

function buildFormStateFromExpanded(expandedBars: string[], previous: TheoryMemory): TheoryMemory {
  const compressedSections = compressExpandedBars(expandedBars);
  const expanded = expandCompressedSections(compressedSections);

  return {
    ...previous,
    expandedBars: expanded.expandedBars,
    formSheetBars: expanded.expandedBars,
    compressedSections,
    expandedToCompressedMap: expanded.expandedToCompressedMap,
    currentExpandedBarIndex: Math.max(0, expanded.expandedBars.length - 1),
  };
}

function buildFormStateFromCompressed(
  compressedSections: CompressedSection[],
  previous: TheoryMemory
): TheoryMemory {
  const expanded = expandCompressedSections(compressedSections);

  return {
    ...previous,
    expandedBars: expanded.expandedBars,
    formSheetBars: expanded.expandedBars,
    compressedSections,
    expandedToCompressedMap: expanded.expandedToCompressedMap,
    currentExpandedBarIndex: Math.min(
      previous.currentExpandedBarIndex,
      Math.max(0, expanded.expandedBars.length - 1)
    ),
  };
}

function createSessionSnapshot(state: StudioState): SessionState {
  const now = Date.now();
  const sessionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${now}`;

  return {
    id: sessionId,
    name: state.sessionName.trim() || "Untitled Session",
    createdAt: now,
    updatedAt: now,
    analysisSettings: state.analysisSettings,
    metronome: state.metronome,
    midiMap: state.midiMap,
    recordedEvents: state.recordedEvents,
    noteHistory: state.noteHistory,
    lastTheoryContext: state.theoryContext,
    theoryMemory: state.theoryMemory,
  };
}

export const useStudioStore = create<StudioState>((set, get) => ({
  source: "idle",
  latestFrame: null,
  frameHistory: [],
  noteHistory: [],
  theoryContext: defaultTheoryContext,
  theoryMemory: defaultTheoryMemory,
  recommendations: [],
  metronome: defaultMetronome,
  metronomeRunning: false,
  midiSupported: false,
  midiDevices: [],
  midiEvents: [],
  recordingMidi: false,
  recordedEvents: [],
  recordingStartMs: null,
  sessionName: "Summer Lab Session",
  analysisSettings: defaultAnalysisSettings,
  midiMap: {},
  setSource: (source) => set({ source }),
  setLatestFrame: (frame) =>
    set((state) => {
      const nextFrames = [...state.frameHistory, frame].slice(-FRAME_HISTORY_LIMIT);
      let nextNotes = state.noteHistory;
      if (frame.note) {
        const last = state.noteHistory[state.noteHistory.length - 1];
        if (last !== frame.note) {
          nextNotes = [...state.noteHistory, frame.note].slice(-NOTE_HISTORY_LIMIT);
        }
      }

      return {
        latestFrame: frame,
        frameHistory: nextFrames,
        noteHistory: nextNotes,
      };
    }),
  appendNote: (note) =>
    set((state) => ({
      noteHistory: [...state.noteHistory, note].slice(-NOTE_HISTORY_LIMIT),
    })),
  setTheory: (context, recommendations, memory) =>
    set((state) => {
      const mergedExpandedBars = mergeExpandedBars(
        state.theoryMemory.expandedBars,
        memory.expandedBars.length > 0 ? memory.expandedBars : memory.formSheetBars
      );

      const mergedMemory = buildFormStateFromExpanded(mergedExpandedBars, {
        ...state.theoryMemory,
        ...memory,
        barsPerPage: state.theoryMemory.barsPerPage || memory.barsPerPage || 32,
        displayMode: state.theoryMemory.displayMode || memory.displayMode || "compressed",
      });

      return {
        theoryContext: context,
        recommendations,
        theoryMemory: mergedMemory,
      };
    }),
  updateAnalysisSettings: (update) =>
    set((state) => {
      const nextTuner = update.tuner
        ? {
            ...state.analysisSettings.tuner,
            ...update.tuner,
          }
        : state.analysisSettings.tuner;

      return {
        analysisSettings: {
          ...state.analysisSettings,
          ...update,
          tuner: nextTuner,
          fileMonitorGain: clamp(update.fileMonitorGain ?? state.analysisSettings.fileMonitorGain, 0, 1),
          targetTempoBpm:
            update.targetTempoBpm === null
              ? null
              : clamp(update.targetTempoBpm ?? state.analysisSettings.targetTempoBpm ?? 100, 30, 260),
        },
      };
    }),
  updateMetronome: (update) =>
    set((state) => {
      const beats = update.timeSigTop ?? state.metronome.timeSigTop;
      const accents = normalizeAccents(update.accents ?? state.metronome.accents, beats);

      return {
        metronome: {
          ...state.metronome,
          ...update,
          accents,
          volume: clamp(update.volume ?? state.metronome.volume, 0, 1),
        },
      };
    }),
  setMetronomeRunning: (running) => set({ metronomeRunning: running }),
  setMidiSupported: (supported) => set({ midiSupported: supported }),
  setMidiDevices: (devices) => set({ midiDevices: devices }),
  addMidiEvent: (event) =>
    set((state) => ({
      midiEvents: [event, ...state.midiEvents].slice(0, 64),
    })),
  clearMidiEvents: () => set({ midiEvents: [] }),
  setRecordingMidi: (recording, startMs) =>
    set({
      recordingMidi: recording,
      recordingStartMs: recording ? (startMs ?? Date.now()) : null,
    }),
  recordMidiEvent: (event) =>
    set((state) => {
      if (!state.recordingMidi || !state.recordingStartMs) {
        return {};
      }

      return {
        recordedEvents: [
          ...state.recordedEvents,
          {
            ...event,
            offsetMs: event.ts - state.recordingStartMs,
          },
        ],
      };
    }),
  setRecordedEvents: (events) => set({ recordedEvents: events }),
  clearRecordedEvents: () => set({ recordedEvents: [] }),
  updateFormSheetBar: (index, chord) =>
    set((state) => {
      const bars = [...state.theoryMemory.expandedBars];
      if (index < 0) {
        return {};
      }
      while (bars.length <= index) {
        bars.push("N.C.");
      }
      bars[index] = chord || "N.C.";
      const next = buildFormStateFromExpanded(bars, state.theoryMemory);
      return {
        theoryMemory: next,
      };
    }),
  insertFormSheetBar: (index) =>
    set((state) => {
      const bars = [...state.theoryMemory.expandedBars];
      const target = Math.max(0, Math.min(index, bars.length));
      bars.splice(target, 0, bars[target - 1] ?? "N.C.");
      const next = buildFormStateFromExpanded(bars, state.theoryMemory);
      return {
        theoryMemory: next,
      };
    }),
  removeFormSheetBar: (index) =>
    set((state) => {
      const bars = [...state.theoryMemory.expandedBars];
      if (bars.length <= 1 || index < 0 || index >= bars.length) {
        return {};
      }
      bars.splice(index, 1);
      const next = buildFormStateFromExpanded(bars, state.theoryMemory);
      return {
        theoryMemory: next,
      };
    }),
  updateCompressedSectionLabel: (sectionId, label) =>
    set((state) => {
      const sections = state.theoryMemory.compressedSections.map((section) =>
        section.id === sectionId ? { ...section, label: label || section.label } : section
      );
      return {
        theoryMemory: {
          ...state.theoryMemory,
          compressedSections: sections,
        },
      };
    }),
  updateCompressedSectionBars: (sectionId, bars) =>
    set((state) => {
      const normalizedBars = bars
        .map((bar) => bar.trim())
        .filter((bar) => bar.length > 0);

      if (normalizedBars.length === 0) {
        return {};
      }

      const sections = state.theoryMemory.compressedSections.map((section) =>
        section.id === sectionId ? { ...section, bars: normalizedBars } : section
      );
      const next = buildFormStateFromCompressed(sections, state.theoryMemory);
      return {
        theoryMemory: next,
      };
    }),
  unlinkCompressedSectionRepeat: (sectionId, repeatIndex) =>
    set((state) => {
      const sections = unlinkRepeatInstance(
        state.theoryMemory.compressedSections,
        sectionId,
        repeatIndex
      );
      const next = buildFormStateFromCompressed(sections, state.theoryMemory);
      return {
        theoryMemory: next,
      };
    }),
  setFormDisplayMode: (mode) =>
    set((state) => ({
      theoryMemory: {
        ...state.theoryMemory,
        displayMode: mode,
      },
    })),
  setBarsPerPage: (bars) =>
    set((state) => ({
      theoryMemory: {
        ...state.theoryMemory,
        barsPerPage: Math.max(8, Math.min(64, Math.round(bars) || 32)),
      },
    })),
  setSessionName: (name) => set({ sessionName: name }),
  applySession: (session) =>
    set(() => {
      const incomingMemory = session.theoryMemory ?? createDefaultTheoryMemory();
      const expandedBars = incomingMemory.expandedBars ?? incomingMemory.formSheetBars ?? [];
      const incomingAnalysis = session.analysisSettings ?? defaultAnalysisSettings;
      const normalizedAnalysisSettings: AnalysisSettings = {
        ...defaultAnalysisSettings,
        ...incomingAnalysis,
        fileMonitorGain: clamp(incomingAnalysis.fileMonitorGain ?? defaultAnalysisSettings.fileMonitorGain, 0, 1),
        targetTempoBpm:
          incomingAnalysis.targetTempoBpm === null
            ? null
            : clamp(
                incomingAnalysis.targetTempoBpm ?? defaultAnalysisSettings.targetTempoBpm ?? 100,
                30,
                260
              ),
        tuner: {
          ...defaultAnalysisSettings.tuner,
          ...(incomingAnalysis.tuner ?? {}),
        },
      };
      const normalizedMemory = buildFormStateFromExpanded(expandedBars, {
        ...createDefaultTheoryMemory(),
        ...incomingMemory,
      });

      return {
        sessionName: session.name,
        analysisSettings: normalizedAnalysisSettings,
        metronome: {
          ...defaultMetronome,
          ...session.metronome,
        },
        midiMap: session.midiMap,
        recordedEvents: session.recordedEvents,
        noteHistory: session.noteHistory,
        theoryContext: session.lastTheoryContext,
        theoryMemory: normalizedMemory,
      };
    }),
  createSessionSnapshot: () => {
    return createSessionSnapshot(get());
  },
}));

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
