import { describe, expect, it } from "vitest";
import { createDefaultTheoryContext, createDefaultTheoryMemory } from "@/lib/theory/defaults";
import {
  analyzeTheoryState,
  buildTheoryContext,
  getTheoryRecommendations,
} from "@/lib/theory/recommendations";

describe("theory recommendations", () => {
  it("detects likely C major context from triad notes", () => {
    const history = ["C4", "E4", "G4", "C5"];
    const context = buildTheoryContext(history, 120);

    expect(context.keyGuess).toBe("C");
    expect(context.scaleGuess).toBe("major");
  });

  it("returns deterministic recommendation buckets", () => {
    const history = ["A3", "C4", "E4", "G4"];
    const context = buildTheoryContext(history, 98);
    const items = getTheoryRecommendations(context, history);

    const types = new Set(items.map((item) => item.type));

    expect(types.has("note")).toBe(true);
    expect(types.has("chord")).toBe(true);
    expect(types.has("scale")).toBe(true);
    expect(Math.max(...items.map((item) => item.confidence))).toBeGreaterThan(0.5);
  });

  it("keeps key stable across brief chromatic notes", () => {
    let context = createDefaultTheoryContext();
    let memory = createDefaultTheoryMemory();

    const stableHistory = ["C4", "E4", "G4", "A4", "F4", "D4", "C5"];
    let result = analyzeTheoryState({
      noteHistory: stableHistory,
      bpm: 120,
      previousContext: context,
      previousMemory: memory,
      nowMs: 1000,
    });

    context = result.context;
    memory = result.memory;

    result = analyzeTheoryState({
      noteHistory: [...stableHistory, "F#4"],
      bpm: 120,
      previousContext: context,
      previousMemory: memory,
      nowMs: 1200,
    });

    expect(result.context.keyGuess).toBe("C");
    expect(result.context.scaleGuess).toBe("major");
  });

  it("learns a repeating progression and builds form patterns", () => {
    const phrase = [
      "C4",
      "E4",
      "G4",
      "C5",
      "F4",
      "A4",
      "C5",
      "F5",
      "G4",
      "B4",
      "D5",
      "G5",
      "C4",
      "E4",
      "G4",
      "C5",
    ];
    const stream = [...phrase, ...phrase];

    let context = createDefaultTheoryContext();
    let memory = createDefaultTheoryMemory();
    const rolling: string[] = [];

    stream.forEach((note, index) => {
      rolling.push(note);
      const result = analyzeTheoryState({
        noteHistory: rolling,
        bpm: 112,
        previousContext: context,
        previousMemory: memory,
        nowMs: 2000 + index * 100,
      });
      context = result.context;
      memory = result.memory;
    });

    expect(memory.progression.length).toBeGreaterThanOrEqual(4);
    expect(memory.formPatterns.length).toBeGreaterThan(0);
  });
});
