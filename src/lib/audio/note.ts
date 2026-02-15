import { TunerTemperament } from "@/types/studio";

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
const JUST_RATIOS_FROM_A = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];
const PYTHAGOREAN_RATIOS_FROM_A = [
  1,
  256 / 243,
  9 / 8,
  32 / 27,
  81 / 64,
  4 / 3,
  729 / 512,
  3 / 2,
  128 / 81,
  27 / 16,
  16 / 9,
  243 / 128,
];

export interface NoteInfo {
  midi: number;
  note: string;
  cents: number;
}

export interface NoteTuningOptions {
  a4Hz?: number;
  temperament?: TunerTemperament;
}

export function frequencyToMidiNumber(frequency: number, options: NoteTuningOptions = {}): number {
  const a4Hz = normalizeA4(options.a4Hz);
  const temperament = options.temperament ?? "equal";

  if (temperament === "equal") {
    return Math.round(12 * Math.log2(frequency / a4Hz) + A4_MIDI);
  }

  const equalGuess = Math.round(12 * Math.log2(frequency / a4Hz) + A4_MIDI);
  let bestMidi = equalGuess;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let midi = equalGuess - 3; midi <= equalGuess + 3; midi += 1) {
    const target = midiToFrequency(midi, options);
    const logDistance = Math.abs(Math.log2(frequency / target));
    if (logDistance < bestDistance) {
      bestDistance = logDistance;
      bestMidi = midi;
    }
  }

  return bestMidi;
}

export function midiToFrequency(midi: number, options: NoteTuningOptions = {}): number {
  const a4Hz = normalizeA4(options.a4Hz);
  const temperament = options.temperament ?? "equal";

  if (temperament === "equal") {
    return a4Hz * Math.pow(2, (midi - A4_MIDI) / 12);
  }

  const ratios = temperament === "just" ? JUST_RATIOS_FROM_A : PYTHAGOREAN_RATIOS_FROM_A;
  const semitoneOffset = midi - A4_MIDI;
  const octaveOffset = Math.floor(semitoneOffset / 12);
  const scaleDegree = modulo(semitoneOffset, 12);

  return a4Hz * Math.pow(2, octaveOffset) * ratios[scaleDegree];
}

export function midiToNoteName(midi: number): string {
  const normalized = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[normalized]}${octave}`;
}

export function stripOctave(note: string): string {
  return note.replace(/[0-9]/g, "");
}

export function frequencyToNoteInfo(frequency: number, options: NoteTuningOptions = {}): NoteInfo {
  const midi = frequencyToMidiNumber(frequency, options);
  const nearest = midiToFrequency(midi, options);
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

function normalizeA4(a4: number | undefined): number {
  if (!Number.isFinite(a4)) {
    return A4_FREQUENCY;
  }

  return Math.max(400, Math.min(490, Number(a4)));
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
