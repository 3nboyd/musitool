import { TheoryContext, TheoryMemory } from "@/types/studio";
import { compressExpandedBars } from "@/lib/theory/form-compression";

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
  const compressedSections = compressExpandedBars([]);

  return {
    stableKey: "C",
    stableScale: "major",
    keyControlMode: "auto",
    autoDetectKeyChanges: true,
    manualKey: "C",
    manualScale: "major",
    keyConfidence: 0.5,
    lastKeyChangeAt: 0,
    progression: [],
    expandedBars: [],
    formSheetBars: [],
    compressedSections,
    expandedToCompressedMap: [],
    barsPerPage: 32,
    displayMode: "compressed",
    currentExpandedBarIndex: 0,
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
