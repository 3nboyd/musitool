import { create } from "zustand";
import {
  AnalysisSource,
  AudioFrameFeature,
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
};

const defaultTheoryContext: TheoryContext = createDefaultTheoryContext();
const defaultTheoryMemory: TheoryMemory = createDefaultTheoryMemory();

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
  analysisSettings: {
    fftSize: number;
    smoothingTimeConstant: number;
  };
  midiMap: Record<string, string>;
  setSource: (source: AnalysisSource) => void;
  setLatestFrame: (frame: AudioFrameFeature) => void;
  appendNote: (note: string) => void;
  setTheory: (
    context: TheoryContext,
    recommendations: TheoryRecommendation[],
    memory: TheoryMemory
  ) => void;
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
  setSessionName: (name: string) => void;
  applySession: (session: SessionState) => void;
  createSessionSnapshot: () => SessionState;
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
  analysisSettings: {
    fftSize: 2048,
    smoothingTimeConstant: 0.85,
  },
  midiMap: {},
  setSource: (source) => set({ source }),
  setLatestFrame: (frame) =>
    set((state) => {
      const nextFrames = [...state.frameHistory, frame].slice(-FRAME_HISTORY_LIMIT);
      const nextNotes = frame.note
        ? [...state.noteHistory, frame.note].slice(-NOTE_HISTORY_LIMIT)
        : state.noteHistory;

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
    set({
      theoryContext: context,
      recommendations,
      theoryMemory: memory,
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
      const bars = [...state.theoryMemory.formSheetBars];
      if (index < 0) {
        return {};
      }
      while (bars.length <= index) {
        bars.push("N.C.");
      }
      bars[index] = chord || "N.C.";
      return {
        theoryMemory: {
          ...state.theoryMemory,
          formSheetBars: bars,
        },
      };
    }),
  insertFormSheetBar: (index) =>
    set((state) => {
      const bars = [...state.theoryMemory.formSheetBars];
      const target = Math.max(0, Math.min(index, bars.length));
      bars.splice(target, 0, bars[target - 1] ?? "N.C.");
      return {
        theoryMemory: {
          ...state.theoryMemory,
          formSheetBars: bars,
        },
      };
    }),
  removeFormSheetBar: (index) =>
    set((state) => {
      const bars = [...state.theoryMemory.formSheetBars];
      if (bars.length <= 1 || index < 0 || index >= bars.length) {
        return {};
      }
      bars.splice(index, 1);
      return {
        theoryMemory: {
          ...state.theoryMemory,
          formSheetBars: bars,
        },
      };
    }),
  setSessionName: (name) => set({ sessionName: name }),
  applySession: (session) =>
    set({
      sessionName: session.name,
      analysisSettings: session.analysisSettings,
      metronome: session.metronome,
      midiMap: session.midiMap,
      recordedEvents: session.recordedEvents,
      noteHistory: session.noteHistory,
      theoryContext: session.lastTheoryContext,
      theoryMemory: session.theoryMemory ?? createDefaultTheoryMemory(),
    }),
  createSessionSnapshot: () => {
    return createSessionSnapshot(get());
  },
}));
