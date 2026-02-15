import { describe, expect, it } from "vitest";
import {
  applySwing,
  buildTickGrid,
  getSubdivisionFactor,
  getTickIntervalMs,
  tapTempoFromTimestamps,
} from "@/lib/metronome/math";
import { MetronomePattern } from "@/types/studio";

describe("metronome math", () => {
  it("computes subdivision factors", () => {
    expect(getSubdivisionFactor("quarter")).toBe(1);
    expect(getSubdivisionFactor("triplet")).toBe(3);
  });

  it("builds tick grid for one bar", () => {
    const pattern: MetronomePattern = {
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

    const grid = buildTickGrid(pattern, 1);
    expect(grid).toHaveLength(8);
    expect(grid[0].accent).toBe(1);
  });

  it("estimates BPM from tap intervals", () => {
    const taps = [0, 500, 1000, 1500];
    expect(tapTempoFromTimestamps(taps)).toBe(120);
  });

  it("applies swing to alternating intervals", () => {
    const base = getTickIntervalMs(120, "eighth");
    const even = applySwing(base, 0, 0.3);
    const odd = applySwing(base, 1, 0.3);

    expect(even).toBeLessThan(base);
    expect(odd).toBeGreaterThan(base);
  });
});
