export type AnalysisSource = "idle" | "microphone" | "file" | "midi";

export type Subdivision = "quarter" | "eighth" | "triplet" | "sixteenth";
export type MetronomeSound = "click" | "woodblock" | "digital" | "shaker";
export type TunerTolerancePreset = "tight" | "standard" | "relaxed";
export type TunerTemperament = "equal" | "just" | "pythagorean";

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

export interface TunerSettings {
  tolerancePreset: TunerTolerancePreset;
  greenRangeCents: number;
  yellowRangeCents: number;
  temperament: TunerTemperament;
  a4Hz: number;
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

export interface CompressedSection {
  id: string;
  label: string;
  bars: string[];
  repeatCount: number;
  altEnding?: string;
}

export interface ExpandedToCompressedMapItem {
  expandedBarIndex: number;
  sectionId: string;
  localBar: number;
}

export type FormDisplayMode = "compressed" | "expanded";
export type KeyControlMode = "auto" | "manual";

export interface TheoryMemory {
  stableKey: string;
  stableScale: string;
  keyControlMode: KeyControlMode;
  autoDetectKeyChanges: boolean;
  manualKey: string;
  manualScale: string;
  keyConfidence: number;
  lastKeyChangeAt: number;
  progression: string[];
  expandedBars: string[];
  formSheetBars: string[];
  compressedSections: CompressedSection[];
  expandedToCompressedMap: ExpandedToCompressedMapItem[];
  barsPerPage: number;
  displayMode: FormDisplayMode;
  currentExpandedBarIndex: number;
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
  volume: number;
  sound: MetronomeSound;
}

export interface AnalysisSettings {
  fftSize: number;
  smoothingTimeConstant: number;
  fileMonitorGain: number;
  targetTempoBpm: number | null;
  tuner: TunerSettings;
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
  analysisSettings: AnalysisSettings;
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
