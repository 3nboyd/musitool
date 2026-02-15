import { describe, expect, it } from "vitest";
import { quantizeMidiEvents } from "@/lib/midi/quantize";

describe("MIDI quantization", () => {
  it("snaps offsets to the nearest grid", () => {
    const events = [
      {
        ts: 0,
        deviceId: "test",
        note: 60,
        velocity: 100,
        channel: 0,
        type: "noteon" as const,
        offsetMs: 117,
      },
      {
        ts: 0,
        deviceId: "test",
        note: 60,
        velocity: 0,
        channel: 0,
        type: "noteoff" as const,
        offsetMs: 488,
      },
    ];

    const quantized = quantizeMidiEvents(events, {
      bpm: 120,
      subdivision: "sixteenth",
      strength: 1,
    });

    expect(quantized[0].offsetMs).toBe(125);
    expect(quantized[1].offsetMs).toBe(500);
  });
});
