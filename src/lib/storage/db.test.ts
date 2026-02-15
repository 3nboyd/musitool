import { describe, expect, it } from "vitest";
import { deleteSession, loadSession, saveSession } from "@/lib/storage/db";
import { SessionState } from "@/types/studio";

describe("session storage", () => {
  it("saves and reloads a session roundtrip", async () => {
    const session: SessionState = {
      id: `test-${Date.now()}`,
      name: "Roundtrip",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      analysisSettings: {
        fftSize: 2048,
        smoothingTimeConstant: 0.85,
        fileMonitorGain: 0.85,
        targetTempoBpm: 100,
        tuner: {
          tolerancePreset: "standard",
          greenRangeCents: 6,
          yellowRangeCents: 14,
          temperament: "equal",
          a4Hz: 440,
        },
      },
      metronome: {
        bpm: 120,
        timeSigTop: 4,
        timeSigBottom: 4,
        subdivision: "eighth",
        swing: 0,
        accents: [1, 0, 0, 0],
        countInBars: 1,
        volume: 0.75,
        sound: "click",
      },
      midiMap: {},
      recordedEvents: [],
      noteHistory: ["C4", "E4", "G4"],
      lastTheoryContext: {
        note: "G4",
        keyGuess: "C",
        scaleGuess: "major",
        chordGuess: "C",
        bpm: 120,
      },
    };

    await saveSession(session);
    const loaded = await loadSession(session.id);

    expect(loaded?.name).toBe(session.name);
    expect(loaded?.noteHistory).toEqual(session.noteHistory);

    await deleteSession(session.id);
  });
});
