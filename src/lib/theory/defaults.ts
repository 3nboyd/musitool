import { TheoryContext, TheoryMemory } from "@/types/studio";

export function createDefaultTheoryContext(): TheoryContext {
  return {
    note: null,
    keyGuess: "C",
    scaleGuess: "major",
    chordGuess: "C",
    bpm: null,
    keyConfidence: 0.5,
    formSectionLabel: null,
    progressionPreview: "",
  };
}

export function createDefaultTheoryMemory(): TheoryMemory {
  return {
    stableKey: "C",
    stableScale: "major",
    keyConfidence: 0.5,
    lastKeyChangeAt: 0,
    progression: [],
    chordTimeline: [],
    formPatterns: [],
    currentFormLabel: null,
    lastProcessedNoteCount: 0,
    lastProcessedTail: "",
    pendingChord: null,
    pendingChordVotes: 0,
    lastRecommendationAt: 0,
    recommendationSignature: "",
    cachedRecommendations: [],
  };
}
