import { MetronomePattern, Subdivision } from "@/types/studio";

export function getSubdivisionFactor(subdivision: Subdivision): number {
  switch (subdivision) {
    case "quarter":
      return 1;
    case "eighth":
      return 2;
    case "triplet":
      return 3;
    case "sixteenth":
      return 4;
    default:
      return 1;
  }
}

export function getTickIntervalMs(bpm: number, subdivision: Subdivision): number {
  const beatsPerSecond = bpm / 60;
  const factor = getSubdivisionFactor(subdivision);
  return 1000 / (beatsPerSecond * factor);
}

export interface TickGridEntry {
  tickIndex: number;
  beatIndex: number;
  subdivisionIndex: number;
  accent: number;
  offsetMs: number;
}

export function buildTickGrid(pattern: MetronomePattern, bars = 1): TickGridEntry[] {
  const factor = getSubdivisionFactor(pattern.subdivision);
  const ticksPerBar = pattern.timeSigTop * factor;
  const intervalMs = getTickIntervalMs(pattern.bpm, pattern.subdivision);
  const entries: TickGridEntry[] = [];

  for (let i = 0; i < ticksPerBar * bars; i += 1) {
    const beatIndex = Math.floor(i / factor) % pattern.timeSigTop;
    const subdivisionIndex = i % factor;
    const accent = pattern.accents[beatIndex] ?? (beatIndex === 0 ? 1 : 0);

    entries.push({
      tickIndex: i,
      beatIndex,
      subdivisionIndex,
      accent,
      offsetMs: i * intervalMs,
    });
  }

  return entries;
}

export function applySwing(intervalMs: number, tickIndex: number, swing: number): number {
  if (swing <= 0) {
    return intervalMs;
  }

  const boundedSwing = Math.max(0, Math.min(0.5, swing));
  const swingShift = intervalMs * boundedSwing * 0.6;

  return tickIndex % 2 === 0 ? intervalMs - swingShift : intervalMs + swingShift;
}

export function tapTempoFromTimestamps(taps: number[]): number | null {
  if (taps.length < 2) {
    return null;
  }

  const intervals: number[] = [];
  for (let i = 1; i < taps.length; i += 1) {
    const delta = taps[i] - taps[i - 1];
    if (delta > 0) {
      intervals.push(delta);
    }
  }

  if (intervals.length === 0) {
    return null;
  }

  const avg = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const bpm = 60000 / avg;

  if (!Number.isFinite(bpm)) {
    return null;
  }

  return Math.max(30, Math.min(240, Math.round(bpm)));
}

export function normalizeAccents(accents: number[], beats: number): number[] {
  if (beats <= 0) {
    return [1];
  }

  const out = Array.from({ length: beats }, (_, index) => (accents[index] ? 1 : 0));

  if (!out.some((value) => value === 1)) {
    return [1, ...out.slice(1)];
  }

  return out;
}
