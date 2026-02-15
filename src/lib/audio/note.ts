const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const A4_FREQUENCY = 440;
const A4_MIDI = 69;

export interface NoteInfo {
  midi: number;
  note: string;
  cents: number;
}

export function frequencyToMidiNumber(frequency: number): number {
  return Math.round(12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI);
}

export function midiToFrequency(midi: number): number {
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

export function midiToNoteName(midi: number): string {
  const normalized = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[normalized]}${octave}`;
}

export function stripOctave(note: string): string {
  return note.replace(/[0-9]/g, "");
}

export function frequencyToNoteInfo(frequency: number): NoteInfo {
  const midi = frequencyToMidiNumber(frequency);
  const nearest = midiToFrequency(midi);
  const cents = 1200 * Math.log2(frequency / nearest);

  return {
    midi,
    note: midiToNoteName(midi),
    cents,
  };
}

export function normalizeCents(cents: number): number {
  if (Number.isNaN(cents) || !Number.isFinite(cents)) {
    return 0;
  }
  return Math.max(-50, Math.min(50, cents));
}

export function velocityToGain(velocity: number): number {
  return Math.max(0.02, Math.min(1, velocity / 127));
}

export function noteNumberToName(noteNumber: number): string {
  return midiToNoteName(noteNumber);
}

export function sanitizeFrequency(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}
