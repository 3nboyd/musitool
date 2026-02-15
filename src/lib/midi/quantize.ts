import { RecordedMidiEvent, Subdivision } from "@/types/studio";
import { getSubdivisionFactor } from "@/lib/metronome/math";

export interface QuantizeOptions {
  bpm: number;
  subdivision: Subdivision;
  strength?: number;
}

export function quantizeMidiEvents(
  events: RecordedMidiEvent[],
  options: QuantizeOptions
): RecordedMidiEvent[] {
  if (events.length === 0) {
    return [];
  }

  const strength = Math.max(0, Math.min(1, options.strength ?? 1));
  const msPerBeat = 60000 / options.bpm;
  const grid = msPerBeat / getSubdivisionFactor(options.subdivision);

  return events.map((event) => {
    const nearest = Math.round(event.offsetMs / grid) * grid;
    const moved = event.offsetMs + (nearest - event.offsetMs) * strength;

    return {
      ...event,
      offsetMs: Math.max(0, Math.round(moved)),
    };
  });
}
