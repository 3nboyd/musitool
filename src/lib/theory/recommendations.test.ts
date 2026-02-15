import { describe, expect, it } from "vitest";
import { buildTheoryContext, getTheoryRecommendations } from "@/lib/theory/recommendations";

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
    expect(items[0].confidence).toBeGreaterThan(0.5);
  });
});
