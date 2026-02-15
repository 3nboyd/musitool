import { describe, expect, it } from "vitest";
import { frequencyToNoteInfo, midiToNoteName } from "@/lib/audio/note";

describe("note mapping", () => {
  it("maps A4 frequency to A4 note", () => {
    const info = frequencyToNoteInfo(440);

    expect(info.note).toBe("A4");
    expect(Math.round(info.cents)).toBe(0);
  });

  it("maps MIDI note numbers to expected names", () => {
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(61)).toBe("C#4");
  });
});
