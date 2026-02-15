export type AnalysisSource = "idle" | "microphone" | "file" | "midi";

export type Subdivision = "quarter" | "eighth" | "triplet" | "sixteenth";

export interface AudioFrameFeature {
  ts: number;
  rms: number;
  peak: number;
  centroid: number;
  pitchHz: number | null;
  note: string | null;
  cents: number | null;
  confidence: number;
  bpm: number | null;
  waveform: number[];
  spectrum: number[];
  source: AnalysisSource;
}

export interface TheoryContext {
  note: string | null;
  keyGuess: string;
  scaleGuess: string;
  chordGuess: string;
  bpm: number | null;
  keyConfidence?: number;
  formSectionLabel?: string | null;
  progressionPreview?: string;
}

export type RecommendationType = "note" | "chord" | "scale";

export interface TheoryRecommendation {
  id: string;
  type: RecommendationType;
  label: string;
  reason: string;
  confidence: number;
}

export interface TheoryChordTimelineEvent {
  index: number;
  chord: string;
  confidence: number;
}

export interface TheoryFormPattern {
  label: string;
  signature: string;
  length: number;
  occurrences: number;
}

export interface TheoryMemory {
  stableKey: string;
  stableScale: string;
  keyConfidence: number;
  lastKeyChangeAt: number;
  progression: string[];
  formSheetBars: string[];
  chordTimeline: TheoryChordTimelineEvent[];
  formPatterns: TheoryFormPattern[];
  currentFormLabel: string | null;
  lastProcessedNoteCount: number;
  lastProcessedTail: string;
  pendingChord: string | null;
  pendingChordVotes: number;
  lastRecommendationAt: number;
  recommendationSignature: string;
  cachedRecommendations: TheoryRecommendation[];
}

export interface MetronomePattern {
  bpm: number;
  timeSigTop: number;
  timeSigBottom: 4 | 8;
  subdivision: Subdivision;
  swing: number;
  accents: number[];
  countInBars: number;
}

export interface MidiEvent {
  ts: number;
  deviceId: string;
  note: number;
  velocity: number;
  channel: number;
  type: "noteon" | "noteoff";
}

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: MIDIPortDeviceState | "unknown";
}

export interface RecordedMidiEvent extends MidiEvent {
  offsetMs: number;
}

export interface SessionState {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  analysisSettings: {
    fftSize: number;
    smoothingTimeConstant: number;
  };
  metronome: MetronomePattern;
  midiMap: Record<string, string>;
  recordedEvents: RecordedMidiEvent[];
  noteHistory: string[];
  lastTheoryContext: TheoryContext;
  theoryMemory?: TheoryMemory;
}

export type WorkerMessageType =
  | "ANALYSIS_START"
  | "ANALYSIS_STOP"
  | "ANALYSIS_FRAME"
  | "ANALYSIS_ERROR"
  | "THEORY_REQUEST"
  | "THEORY_RESPONSE"
  | "METRONOME_START"
  | "METRONOME_STOP"
  | "METRONOME_UPDATE"
  | "MIDI_DEVICES"
  | "MIDI_NOTE_ON"
  | "MIDI_NOTE_OFF"
  | "MIDI_ERROR";

export interface WorkerMessage<T = unknown> {
  type: WorkerMessageType;
  payload: T;
}
