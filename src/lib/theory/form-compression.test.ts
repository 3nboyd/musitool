import { describe, expect, it } from "vitest";
import {
  compressExpandedBars,
  expandCompressedSections,
  mergeExpandedBars,
  unlinkRepeatInstance,
} from "@/lib/theory/form-compression";

describe("form compression", () => {
  it("compresses AABA/AABA-style bars into repeat-aware roadmap", () => {
    const a = ["Cmaj7", "Am7", "Dm7", "G7", "Cmaj7", "Am7", "Dm7", "G7"];
    const b = ["Fmaj7", "Fm7", "Em7", "A7", "Dm7", "G7", "Cmaj7", "G7"];

    const expanded = [...a, ...a, ...b, ...a, ...a, ...a, ...b, ...a];
    const compressed = compressExpandedBars(expanded);

    expect(compressed[0].label).toBe("A");
    expect(compressed[0].repeatCount).toBe(2);
    expect(compressed[1].label).toBe("B");
    expect(compressed[2].label).toBe("A");
    expect(compressed[2].repeatCount).toBe(3);
  });

  it("builds expanded-to-compressed mapping", () => {
    const compressed = [
      { id: "A-0", label: "A", bars: ["Cmaj7", "Fmaj7"], repeatCount: 2 },
      { id: "B-1", label: "B", bars: ["G7", "Cmaj7"], repeatCount: 1 },
    ];

    const expanded = expandCompressedSections(compressed);

    expect(expanded.expandedBars).toEqual(["Cmaj7", "Fmaj7", "Cmaj7", "Fmaj7", "G7", "Cmaj7"]);
    expect(expanded.expandedToCompressedMap[2].sectionId).toBe("A-0");
    expect(expanded.expandedToCompressedMap[2].localBar).toBe(0);
  });

  it("unlinks one repeat instance", () => {
    const sections = [{ id: "A-0", label: "A", bars: ["Cmaj7", "Fmaj7"], repeatCount: 3 }];

    const unlinked = unlinkRepeatInstance(sections, "A-0", 1);

    expect(unlinked).toHaveLength(3);
    expect(unlinked[1].repeatCount).toBe(1);
  });

  it("merges detected bars without overriding manual values", () => {
    const existing = ["Cmaj7", "Am7", "N.C.", "G7"];
    const detected = ["Cmaj7", "Am7", "Dm7", "G7", "Cmaj7"];

    expect(mergeExpandedBars(existing, detected)).toEqual(["Cmaj7", "Am7", "Dm7", "G7", "Cmaj7"]);
  });
});
