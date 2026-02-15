import { Chord, Interval, Note, Scale } from "@tonaljs/tonal";
import { stripOctave } from "@/lib/audio/note";
import { createDefaultTheoryContext, createDefaultTheoryMemory } from "@/lib/theory/defaults";
import {
  compressExpandedBars,
  expandCompressedSections,
  mergeExpandedBars,
} from "@/lib/theory/form-compression";
import {
  TheoryContext,
  TheoryFormPattern,
  TheoryMemory,
  TheoryRecommendation,
} from "@/types/studio";

const ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SCALES = ["major", "minor", "dorian", "mixolydian", "lydian", "phrygian"];
const SCALE_RETAIN_MARGIN = 2.2;
const SCALE_SWITCH_CONFIDENCE_BONUS = 0.12;
const MIN_KEY_SWITCH_HOLD_MS = 4200;
const MIN_KEY_SWITCH_BARS = 2.5;
const RECOMMENDATION_MIN_HOLD_MS = 12000;
const RECOMMENDATION_HOLD_BARS = 8;

interface TheoryAnalysisInput {
  noteHistory: string[];
  bpm: number | null;
  previousContext: TheoryContext;
  previousMemory: TheoryMemory;
  nowMs: number;
}

interface ScaleCandidate {
  keyGuess: string;
  scaleGuess: string;
  score: number;
  confidence: number;
  scaleNotes: string[];
  rootChroma: number;
}

interface StableScaleDecision {
  keyGuess: string;
  scaleGuess: string;
  confidence: number;
  lastKeyChangeAt: number;
}

interface ChordGuess {
  chord: string;
  confidence: number;
}

interface ProgressionUpdate {
  progression: string[];
  chordTimeline: TheoryMemory["chordTimeline"];
  pendingChord: string | null;
  pendingChordVotes: number;
  lastProcessedNoteCount: number;
  lastProcessedTail: string;
}

interface FormPrediction {
  chord: string;
  confidence: number;
  basisLength: number;
}

export function analyzeTheoryState(input: TheoryAnalysisInput): {
  context: TheoryContext;
  recommendations: TheoryRecommendation[];
  memory: TheoryMemory;
} {
  const memory = normalizeMemory(input.previousMemory);
  const normalized = normalizeNotes(input.noteHistory);

  const candidates = rankScaleCandidates(normalized);
  const stable = chooseStableScale(candidates, memory, input.nowMs, input.bpm);
  const stableScale = Scale.get(`${stable.keyGuess} ${stable.scaleGuess}`);
  const scaleNotes = stableScale.notes.length > 0 ? stableScale.notes : Scale.get("C major").notes;

  const chordCandidates = buildChordCandidates(stable.keyGuess, stable.scaleGuess);
  const chordGuess = inferChordGuess(normalized, chordCandidates);

  const progressionUpdate = updateProgression(memory, chordGuess, normalized);
  const progression = progressionUpdate.progression.slice(-64);
  const formPatterns = buildFormPatterns(progression);
  const currentFormLabel = detectCurrentFormLabel(progression, formPatterns);
  const expandedBars = mergeExpandedBars(memory.expandedBars, progression);
  const compressedSections = compressExpandedBars(expandedBars);
  const expandedForm = expandCompressedSections(compressedSections);
  const currentExpandedBarIndex = Math.max(0, expandedBars.length - 1);

  const currentNote = input.noteHistory.length > 0 ? input.noteHistory[input.noteHistory.length - 1] : null;

  const context: TheoryContext = {
    note: currentNote,
    keyGuess: stable.keyGuess,
    scaleGuess: stable.scaleGuess,
    chordGuess: chordGuess.chord,
    bpm: input.bpm,
    keyConfidence: round2(stable.confidence),
    formSectionLabel: currentFormLabel,
    progressionPreview: progression.slice(-8).join(" - "),
  };

  const freshRecommendations = buildTheoryRecommendations({
    context,
    normalizedHistory: normalized,
    scaleNotes,
    chordCandidates,
    progression,
    formPatterns,
  });

  const signature = recommendationSignature(freshRecommendations);
  const keyChanged =
    memory.stableKey !== stable.keyGuess || memory.stableScale !== stable.scaleGuess;
  const sectionChanged = (memory.currentFormLabel ?? null) !== (currentFormLabel ?? null);
  const recommendationHoldMs = getRecommendationHoldMs(input.bpm);

  const shouldUseCached =
    input.nowMs - memory.lastRecommendationAt < recommendationHoldMs &&
    !keyChanged &&
    !sectionChanged &&
    memory.cachedRecommendations.length > 0;

  const recommendations = shouldUseCached
    ? memory.cachedRecommendations
    : freshRecommendations;

  const formSheetBars = mergeFormSheetBars(memory.formSheetBars, progression);

  const nextMemory: TheoryMemory = {
    ...memory,
    stableKey: stable.keyGuess,
    stableScale: stable.scaleGuess,
    keyConfidence: stable.confidence,
    lastKeyChangeAt: stable.lastKeyChangeAt,
    progression,
    expandedBars: expandedForm.expandedBars,
    formSheetBars,
    compressedSections,
    expandedToCompressedMap: expandedForm.expandedToCompressedMap,
    barsPerPage: memory.barsPerPage > 0 ? memory.barsPerPage : 32,
    displayMode: memory.displayMode ?? "compressed",
    currentExpandedBarIndex,
    chordTimeline: progressionUpdate.chordTimeline.slice(-64),
    formPatterns,
    currentFormLabel,
    pendingChord: progressionUpdate.pendingChord,
    pendingChordVotes: progressionUpdate.pendingChordVotes,
    lastProcessedNoteCount: progressionUpdate.lastProcessedNoteCount,
    lastProcessedTail: progressionUpdate.lastProcessedTail,
    lastRecommendationAt: shouldUseCached ? memory.lastRecommendationAt : input.nowMs,
    recommendationSignature: shouldUseCached ? memory.recommendationSignature : signature,
    cachedRecommendations: shouldUseCached ? memory.cachedRecommendations : freshRecommendations,
  };

  return {
    context,
    recommendations,
    memory: nextMemory,
  };
}

export function buildTheoryContext(noteHistory: string[], bpm: number | null): TheoryContext {
  const result = analyzeTheoryState({
    noteHistory,
    bpm,
    previousContext: createDefaultTheoryContext(),
    previousMemory: createDefaultTheoryMemory(),
    nowMs: Date.now(),
  });

  return result.context;
}

export function getTheoryRecommendations(
  context: TheoryContext,
  noteHistory: string[]
): TheoryRecommendation[] {
  const seedMemory = createDefaultTheoryMemory();
  seedMemory.stableKey = context.keyGuess;
  seedMemory.stableScale = context.scaleGuess;
  seedMemory.keyConfidence = context.keyConfidence ?? 0.5;

  const result = analyzeTheoryState({
    noteHistory,
    bpm: context.bpm,
    previousContext: context,
    previousMemory: seedMemory,
    nowMs: Date.now(),
  });

  return result.recommendations;
}

export function buildCircleOfFifths(root = "C"): string[] {
  const notes: string[] = [Note.simplify(root)];
  let current = root;

  for (let i = 0; i < 11; i += 1) {
    current = Note.transpose(current, "5P");
    notes.push(Note.simplify(current));
  }

  return notes;
}

export function distanceBetweenNotes(a: string, b: string): string {
  return Interval.distance(stripOctave(a), stripOctave(b));
}

function normalizeMemory(memory: TheoryMemory | null | undefined): TheoryMemory {
  const fallback = createDefaultTheoryMemory();
  if (!memory) {
    return fallback;
  }

  return {
    ...fallback,
    ...memory,
    progression: memory.progression ?? [],
    expandedBars: memory.expandedBars ?? memory.formSheetBars ?? [],
    formSheetBars: memory.formSheetBars ?? [],
    compressedSections: memory.compressedSections ?? compressExpandedBars(memory.expandedBars ?? []),
    expandedToCompressedMap: memory.expandedToCompressedMap ?? [],
    barsPerPage: memory.barsPerPage ?? 32,
    displayMode: memory.displayMode ?? "compressed",
    currentExpandedBarIndex: memory.currentExpandedBarIndex ?? 0,
    chordTimeline: memory.chordTimeline ?? [],
    formPatterns: memory.formPatterns ?? [],
    cachedRecommendations: memory.cachedRecommendations ?? [],
  };
}

function normalizeNotes(noteHistory: string[]): string[] {
  return noteHistory.map(stripOctave).filter((note): note is string => Boolean(note));
}

function rankScaleCandidates(noteHistory: string[]): ScaleCandidate[] {
  if (noteHistory.length === 0) {
    return [];
  }

  const chromaCounts = countChromas(noteHistory.slice(-64));
  const total = noteHistory.length;
  const candidates: ScaleCandidate[] = [];

  for (const root of ROOTS) {
    for (const scaleGuess of SCALES) {
      const scale = Scale.get(`${root} ${scaleGuess}`);
      if (scale.notes.length === 0) {
        continue;
      }

      const chromas = scale.notes
        .map((note) => Note.chroma(note))
        .filter((chroma): chroma is number => chroma !== null);

      if (chromas.length === 0) {
        continue;
      }

      let inScale = 0;
      let outScale = 0;

      chromaCounts.forEach((count, chroma) => {
        if (chromas.includes(chroma)) {
          inScale += count;
        } else {
          outScale += count;
        }
      });

      const rootChroma = Note.chroma(root) ?? 0;
      const tonicWeight = chromaCounts.get(rootChroma) ?? 0;
      const latestChroma = noteHistory.length > 0 ? Note.chroma(noteHistory[noteHistory.length - 1]) : null;
      const cadenceBoost = latestChroma === rootChroma ? 0.75 : 0;

      const score = inScale * 1.25 - outScale * 1.45 + tonicWeight * 0.8 + cadenceBoost;
      const confidence = total > 0 ? clamp((inScale - outScale * 0.5) / total, 0.05, 1) : 0.05;

      candidates.push({
        keyGuess: Note.simplify(root),
        scaleGuess,
        score,
        confidence,
        scaleNotes: scale.notes,
        rootChroma,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function chooseStableScale(
  rankedCandidates: ScaleCandidate[],
  memory: TheoryMemory,
  nowMs: number,
  bpm: number | null
): StableScaleDecision {
  const best = rankedCandidates[0];
  if (!best) {
    return {
      keyGuess: memory.stableKey,
      scaleGuess: memory.stableScale,
      confidence: memory.keyConfidence,
      lastKeyChangeAt: memory.lastKeyChangeAt,
    };
  }

  const previous =
    rankedCandidates.find(
      (candidate) =>
        candidate.keyGuess === memory.stableKey && candidate.scaleGuess === memory.stableScale
    ) ?? best;

  const same =
    best.keyGuess === memory.stableKey && best.scaleGuess === memory.stableScale;

  if (same) {
    return {
      keyGuess: best.keyGuess,
      scaleGuess: best.scaleGuess,
      confidence: memory.keyConfidence * 0.7 + best.confidence * 0.3,
      lastKeyChangeAt: memory.lastKeyChangeAt,
    };
  }

  const scoreMargin = best.score - previous.score;
  const confidenceThreshold = memory.keyConfidence + SCALE_SWITCH_CONFIDENCE_BONUS;
  const holdMs = getKeySwitchHoldMs(bpm);
  const inHoldWindow = nowMs - memory.lastKeyChangeAt < holdMs;
  const strongOverride = scoreMargin >= 4.8 && best.confidence >= confidenceThreshold + 0.1;

  if (
    scoreMargin < SCALE_RETAIN_MARGIN ||
    best.confidence < confidenceThreshold ||
    (inHoldWindow && memory.lastKeyChangeAt > 0 && !strongOverride)
  ) {
    return {
      keyGuess: memory.stableKey,
      scaleGuess: memory.stableScale,
      confidence: clamp(memory.keyConfidence * 0.98, 0.35, 0.98),
      lastKeyChangeAt: memory.lastKeyChangeAt,
    };
  }

  return {
    keyGuess: best.keyGuess,
    scaleGuess: best.scaleGuess,
    confidence: best.confidence,
    lastKeyChangeAt: nowMs,
  };
}

function inferChordGuess(noteHistory: string[], chordCandidates: string[]): ChordGuess {
  if (chordCandidates.length === 0) {
    return {
      chord: "C",
      confidence: 0.4,
    };
  }

  const window = noteHistory.slice(-10);
  const chromaSet = new Set(
    window
      .map((note) => Note.chroma(note))
      .filter((chroma): chroma is number => chroma !== null)
  );

  let best: ChordGuess = {
    chord: chordCandidates[0],
    confidence: 0.4,
  };

  for (const candidate of chordCandidates) {
    const chord = Chord.get(candidate);
    const notes = chord.notes.length > 0 ? chord.notes : [Note.get(candidate).pc ?? "C"];
    const chordChromas = notes
      .map((note) => Note.chroma(note))
      .filter((chroma): chroma is number => chroma !== null);

    if (chordChromas.length === 0) {
      continue;
    }

    const hits = chordChromas.filter((chroma) => chromaSet.has(chroma)).length;
    const rootChroma = Note.chroma(chord.tonic ?? candidate) ?? chordChromas[0];
    const rootHit = chromaSet.has(rootChroma);

    const score = hits * 0.95 + (rootHit ? 0.6 : 0) + (hits >= 2 ? 0.25 : 0);
    const confidence = clamp(score / 3.2, 0.1, 0.98);

    if (confidence > best.confidence) {
      best = {
        chord: candidate,
        confidence,
      };
    }
  }

  return best;
}

function updateProgression(
  memory: TheoryMemory,
  chordGuess: ChordGuess,
  normalizedHistory: string[]
): ProgressionUpdate {
  const progression = [...memory.progression];
  const chordTimeline = [...memory.chordTimeline];

  let pendingChord = memory.pendingChord;
  let pendingChordVotes = memory.pendingChordVotes;
  const lastProcessedNoteCount = normalizedHistory.length;
  const tail = normalizedHistory.slice(-4).join("|");

  if (!tail || tail === memory.lastProcessedTail) {
    return {
      progression,
      chordTimeline,
      pendingChord,
      pendingChordVotes,
      lastProcessedNoteCount,
      lastProcessedTail: memory.lastProcessedTail,
    };
  }

  if (pendingChord === chordGuess.chord) {
    pendingChordVotes += 1;
  } else {
    pendingChord = chordGuess.chord;
    pendingChordVotes = 1;
  }

  if (pendingChordVotes >= 2 && chordGuess.confidence >= 0.42) {
    const last = progression[progression.length - 1];
    if (last !== chordGuess.chord) {
      progression.push(chordGuess.chord);
      chordTimeline.push({
        index: progression.length - 1,
        chord: chordGuess.chord,
        confidence: round2(chordGuess.confidence),
      });
    }
    pendingChordVotes = 1;
  }

  return {
    progression,
    chordTimeline,
    pendingChord,
    pendingChordVotes,
    lastProcessedNoteCount,
    lastProcessedTail: tail,
  };
}

function buildFormPatterns(progression: string[]): TheoryFormPattern[] {
  if (progression.length < 4) {
    return [];
  }

  const signatures = new Map<string, { length: number; count: number }>();

  for (const length of [4, 3, 2]) {
    for (let i = 0; i <= progression.length - length; i += 1) {
      const signature = progression.slice(i, i + length).join("-");
      const existing = signatures.get(signature);
      if (existing) {
        existing.count += 1;
      } else {
        signatures.set(signature, { length, count: 1 });
      }
    }
  }

  const frequent = [...signatures.entries()]
    .filter(([, value]) => value.count >= 2)
    .sort((a, b) => {
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count;
      }
      return b[1].length - a[1].length;
    })
    .slice(0, 6);

  return frequent.map(([signature, value], index) => ({
    label: String.fromCharCode(65 + index),
    signature,
    length: value.length,
    occurrences: value.count,
  }));
}

function detectCurrentFormLabel(
  progression: string[],
  patterns: TheoryFormPattern[]
): string | null {
  if (progression.length === 0 || patterns.length === 0) {
    return null;
  }

  const sorted = [...patterns].sort((a, b) => b.length - a.length);
  for (const pattern of sorted) {
    const tail = progression.slice(-pattern.length).join("-");
    if (tail === pattern.signature) {
      return pattern.label;
    }
  }

  return null;
}

function predictNextFromForm(progression: string[]): FormPrediction | null {
  for (const basisLength of [3, 2, 1]) {
    if (progression.length <= basisLength) {
      continue;
    }

    const basis = progression.slice(-basisLength).join("-");
    const followUps = new Map<string, number>();
    let total = 0;

    for (let i = 0; i <= progression.length - basisLength - 1; i += 1) {
      const signature = progression.slice(i, i + basisLength).join("-");
      if (signature !== basis) {
        continue;
      }

      const nextChord = progression[i + basisLength];
      followUps.set(nextChord, (followUps.get(nextChord) ?? 0) + 1);
      total += 1;
    }

    if (followUps.size === 0 || total === 0) {
      continue;
    }

    const best = [...followUps.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!best) {
      continue;
    }

    return {
      chord: best[0],
      confidence: clamp(best[1] / total, 0.35, 0.98),
      basisLength,
    };
  }

  return null;
}

function buildTheoryRecommendations(input: {
  context: TheoryContext;
  normalizedHistory: string[];
  scaleNotes: string[];
  chordCandidates: string[];
  progression: string[];
  formPatterns: TheoryFormPattern[];
}): TheoryRecommendation[] {
  const recommendations: TheoryRecommendation[] = [];

  const current = input.context.note ? stripOctave(input.context.note) : null;
  const scaleName = `${input.context.keyGuess} ${input.context.scaleGuess}`;

  const scaleSuggestions = buildImprovisationScaleSuggestions(input);
  scaleSuggestions.forEach((suggestion) => {
    recommendations.push(
      makeRecommendation("scale", suggestion.label, suggestion.reason, suggestion.confidence)
    );
  });

  const nextFromForm = predictNextFromForm(input.progression);
  if (nextFromForm) {
    recommendations.push(
      makeRecommendation(
        "chord",
        nextFromForm.chord,
        `Learned from repeated progression shape (${nextFromForm.basisLength}-chord context).`,
        clamp(0.6 + nextFromForm.confidence * 0.35, 0, 0.99)
      )
    );
  }

  if (current) {
    const idx = input.scaleNotes.indexOf(current);
    const next = idx >= 0 ? input.scaleNotes[(idx + 1) % input.scaleNotes.length] : input.scaleNotes[0];
    const third = idx >= 0 ? input.scaleNotes[(idx + 2) % input.scaleNotes.length] : input.scaleNotes[2];
    const fifth = idx >= 0 ? input.scaleNotes[(idx + 4) % input.scaleNotes.length] : input.scaleNotes[4];

    recommendations.push(
      makeRecommendation("note", next, `Stepwise motion inside ${scaleName}.`, 0.9),
      makeRecommendation("note", third, `Third relationship from ${current} keeps tonal center.`, 0.84),
      makeRecommendation("note", fifth, `Perfect-fifth stability against ${current}.`, 0.8)
    );
  } else {
    recommendations.push(
      makeRecommendation("note", input.scaleNotes[0], `Establish tonic of ${scaleName}.`, 0.78),
      makeRecommendation("note", input.scaleNotes[4], `Dominant anchor for tonal pull.`, 0.72)
    );
  }

  input.chordCandidates.slice(0, 3).forEach((candidate, index) => {
    recommendations.push(
      makeRecommendation(
        "chord",
        candidate,
        `Diatonic option ${index + 1} in ${scaleName}.`,
        Math.max(0.55, 0.83 - index * 0.08)
      )
    );
  });

  if (input.formPatterns.length > 0) {
    const top = input.formPatterns[0];
    recommendations.push(
      makeRecommendation(
        "chord",
        `Section ${top.label}: ${top.signature.replace(/-/g, " -> ")}`,
        `Detected repeating form section ${top.label} (${top.occurrences}x).`,
        clamp(0.45 + top.occurrences * 0.08, 0, 0.92)
      )
    );
  }

  return uniqueRecommendations(recommendations).slice(0, 12);
}

interface ScaleSuggestion {
  label: string;
  reason: string;
  confidence: number;
}

function buildImprovisationScaleSuggestions(input: {
  context: TheoryContext;
  normalizedHistory: string[];
  scaleNotes: string[];
  chordCandidates: string[];
  progression: string[];
  formPatterns: TheoryFormPattern[];
}): ScaleSuggestion[] {
  const suggestions: ScaleSuggestion[] = [];
  const keyScale = `${input.context.keyGuess} ${input.context.scaleGuess}`;
  const uniqueSet = uniqueNotes(input.normalizedHistory);

  pushScaleSuggestion(
    suggestions,
    keyScale,
    `Key-center scale from stable note-set inference (${uniqueSet.join(", ") || "insufficient notes"}).`,
    input.context.keyConfidence ?? 0.62
  );

  const chord = Chord.get(input.context.chordGuess);
  const chordRoot = Note.simplify(chord.tonic ?? input.context.keyGuess);
  const symbol = input.context.chordGuess.toLowerCase();
  const dominantChord = isDominantChord(symbol);
  const minorChord = isMinorChord(symbol);
  const majorChord = isMajorChord(symbol);
  const diminishedChord = symbol.includes("dim") || symbol.includes("o");
  const halfDiminished = symbol.includes("m7b5") || symbol.includes("ø");
  const alteredDominant = symbol.includes("alt") || symbol.includes("b9") || symbol.includes("#9");

  if (dominantChord) {
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} mixolydian`,
      `Primary dominant sound over ${input.context.chordGuess}.`,
      0.82
    );
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} lydian dominant`,
      `Use for #11 dominant color when tension rises.`,
      0.74
    );
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} altered`,
      `Outside dominant color for altered tensions.`,
      alteredDominant ? 0.76 : 0.62
    );
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} half-whole diminished`,
      `Symmetric dominant option for b9/#9 motion.`,
      alteredDominant ? 0.72 : 0.6
    );
  }

  if (minorChord) {
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} dorian`,
      `Reliable minor improv vocabulary over ${input.context.chordGuess}.`,
      0.8
    );
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} melodic minor`,
      `Modern minor color when the line wants major-6 color.`,
      0.71
    );
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} phrygian`,
      `Darker minor option for b2 color.`,
      0.67
    );
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} egyptian`,
      `Pentatonic variant for open, modal phrasing on minor vamps.`,
      0.59
    );
  }

  if (majorChord) {
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} ionian`,
      `Inside major line over ${input.context.chordGuess}.`,
      0.77
    );
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} lydian`,
      `Major color with raised 4th tension.`,
      0.71
    );
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} major pentatonic`,
      `Simple melodic contour for clean inside lines.`,
      0.68
    );
  }

  if (diminishedChord || halfDiminished) {
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} locrian`,
      `Functional fit for half-diminished movement.`,
      0.7
    );
    pushScaleSuggestion(
      suggestions,
      `${chordRoot} diminished`,
      `Symmetric diminished color over tense passing chords.`,
      0.66
    );
  }

  const progressionHint = detectTurnaroundHint(input.progression);
  if (progressionHint) {
    pushScaleSuggestion(
      suggestions,
      `${progressionHint.dominantRoot} altered`,
      `ii-V-I tendency detected; altered dominant works before resolution.`,
      0.73
    );
    pushScaleSuggestion(
      suggestions,
      `${progressionHint.dominantRoot} phrygian dominant`,
      `Use for dominant b9 flavor in cadential moments.`,
      0.62
    );
  }

  const repeatingMinorSection =
    input.formPatterns.length > 0 &&
    input.formPatterns[0].occurrences >= 2 &&
    (minorChord || input.context.scaleGuess === "minor" || input.context.scaleGuess === "phrygian");
  if (repeatingMinorSection) {
    pushScaleSuggestion(
      suggestions,
      `${input.context.keyGuess} hirajoshi`,
      `Section repeats suggest a static color center; try a concise exotic color.`,
      0.54
    );
  }

  return suggestions.slice(0, 7);
}

function pushScaleSuggestion(
  out: ScaleSuggestion[],
  label: string,
  reason: string,
  confidence: number
): void {
  const canonical = canonicalScaleName(label);
  if (!canonical) {
    return;
  }

  if (out.some((item) => item.label === canonical)) {
    return;
  }

  out.push({
    label: canonical,
    reason,
    confidence: clamp(confidence, 0, 1),
  });
}

function canonicalScaleName(label: string): string | null {
  const normalized = label.replace(/\s+/g, " ").trim();
  const scale = Scale.get(normalized);
  if (scale.notes.length === 0) {
    return null;
  }
  return normalized;
}

function isDominantChord(symbol: string): boolean {
  const quality = extractChordQualityToken(symbol);
  return quality.includes("7") && !quality.includes("maj") && !isMinorChord(symbol);
}

function isMinorChord(symbol: string): boolean {
  const quality = extractChordQualityToken(symbol);
  return (quality.startsWith("m") || quality.includes("min")) && !quality.startsWith("maj");
}

function isMajorChord(symbol: string): boolean {
  const quality = extractChordQualityToken(symbol);
  return !isMinorChord(symbol) && !isDominantChord(symbol) && !quality.includes("dim");
}

function extractChordQualityToken(symbol: string): string {
  return symbol.replace(/^[a-g](#|b)?/i, "").toLowerCase();
}

function detectTurnaroundHint(progression: string[]): { dominantRoot: string } | null {
  if (progression.length < 3) {
    return null;
  }

  const tail = progression.slice(-3);
  const roots = tail
    .map((chordName) => Chord.get(chordName).tonic ?? null)
    .filter((pc): pc is string => Boolean(pc));
  if (roots.length < 3) {
    return null;
  }

  const dominantRoot = roots[1];
  const expectedResolution = Note.simplify(Note.transpose(dominantRoot, "4P"));
  if (Note.simplify(roots[2]) !== expectedResolution) {
    return null;
  }

  return {
    dominantRoot: Note.simplify(dominantRoot),
  };
}

function buildChordCandidates(key: string, scale: string): string[] {
  const scaleNotes = Scale.get(`${key} ${scale}`).notes;
  if (scaleNotes.length < 7) {
    return fallbackChordCandidates(key, scale);
  }

  const majorLike = scale === "major" || scale === "lydian" || scale === "mixolydian";
  const qualities = majorLike
    ? ["", "m", "m", "", "", "m", "dim"]
    : ["m", "dim", "", "m", "m", "", ""];

  return scaleNotes.slice(0, 7).map((note, index) => `${Note.simplify(note)}${qualities[index]}`);
}

function fallbackChordCandidates(key: string, scale: string): string[] {
  if (scale === "minor" || scale === "phrygian") {
    const tonic = `${Note.simplify(key)}m`;
    const subdominant = `${Note.simplify(Note.transpose(key, "4P"))}m`;
    const dominant = `${Note.simplify(Note.transpose(key, "5P"))}m`;
    const leading = `${Note.simplify(Note.transpose(key, "7m"))}dim`;
    return [tonic, subdominant, dominant, leading];
  }

  const tonic = Note.simplify(key);
  const subdominant = Note.simplify(Note.transpose(key, "4P"));
  const dominant = Note.simplify(Note.transpose(key, "5P"));
  const relativeMinor = `${Note.simplify(Note.transpose(key, "6M"))}m`;

  return [tonic, subdominant, dominant, relativeMinor];
}

function recommendationSignature(recommendations: TheoryRecommendation[]): string {
  return recommendations
    .slice(0, 5)
    .map((item) => `${item.type}:${item.label}`)
    .join("|");
}

function countChromas(notes: string[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const note of notes) {
    const chroma = Note.chroma(note);
    if (chroma === null) {
      continue;
    }

    counts.set(chroma, (counts.get(chroma) ?? 0) + 1);
  }

  return counts;
}

function uniqueNotes(noteHistory: string[]): string[] {
  return [...new Set(noteHistory)];
}

function uniqueRecommendations(recommendations: TheoryRecommendation[]): TheoryRecommendation[] {
  const seen = new Set<string>();
  const out: TheoryRecommendation[] = [];

  for (const item of recommendations) {
    const key = `${item.type}:${item.label}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(item);
  }

  return out;
}

function mergeFormSheetBars(existingBars: string[], progression: string[]): string[] {
  if (progression.length === 0) {
    return existingBars;
  }

  const bars = existingBars.length > 0 ? [...existingBars] : [...progression];
  for (let i = 0; i < progression.length; i += 1) {
    const current = bars[i];
    if (!current || current.trim().length === 0) {
      bars[i] = progression[i];
    }
  }

  return bars;
}

function makeRecommendation(
  type: TheoryRecommendation["type"],
  label: string,
  reason: string,
  confidence: number
): TheoryRecommendation {
  const idLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return {
    id: `${type}-${idLabel}`,
    type,
    label,
    reason,
    confidence: clamp(confidence, 0, 1),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getKeySwitchHoldMs(bpm: number | null): number {
  if (!bpm || bpm <= 0) {
    return MIN_KEY_SWITCH_HOLD_MS;
  }

  const barMs = (60000 * 4) / bpm;
  return Math.max(MIN_KEY_SWITCH_HOLD_MS, barMs * MIN_KEY_SWITCH_BARS);
}

function getRecommendationHoldMs(bpm: number | null): number {
  if (!bpm || bpm <= 0) {
    return RECOMMENDATION_MIN_HOLD_MS;
  }

  const barMs = (60000 * 4) / bpm;
  return Math.max(RECOMMENDATION_MIN_HOLD_MS, barMs * RECOMMENDATION_HOLD_BARS);
}
