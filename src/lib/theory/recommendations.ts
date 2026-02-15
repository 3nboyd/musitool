import { Chord, Interval, Note, Scale } from "@tonaljs/tonal";
import { stripOctave } from "@/lib/audio/note";
import { createDefaultTheoryContext, createDefaultTheoryMemory } from "@/lib/theory/defaults";
import {
  TheoryContext,
  TheoryFormPattern,
  TheoryMemory,
  TheoryRecommendation,
} from "@/types/studio";

const ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SCALES = ["major", "minor", "dorian", "mixolydian", "lydian", "phrygian"];
const SCALE_RETAIN_MARGIN = 1.4;
const SCALE_SWITCH_CONFIDENCE_BONUS = 0.08;
const RECOMMENDATION_REFRESH_MS = 2400;

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
  const stable = chooseStableScale(candidates, memory, input.nowMs);
  const stableScale = Scale.get(`${stable.keyGuess} ${stable.scaleGuess}`);
  const scaleNotes = stableScale.notes.length > 0 ? stableScale.notes : Scale.get("C major").notes;

  const chordCandidates = buildChordCandidates(stable.keyGuess, stable.scaleGuess);
  const chordGuess = inferChordGuess(normalized, chordCandidates);

  const progressionUpdate = updateProgression(memory, chordGuess, normalized);
  const progression = progressionUpdate.progression.slice(-64);
  const formPatterns = buildFormPatterns(progression);
  const currentFormLabel = detectCurrentFormLabel(progression, formPatterns);

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
  const chordChanged =
    (memory.progression[memory.progression.length - 1] ?? null) !==
    (progression[progression.length - 1] ?? null);

  const shouldUseCached =
    input.nowMs - memory.lastRecommendationAt < RECOMMENDATION_REFRESH_MS &&
    !keyChanged &&
    !chordChanged &&
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
    formSheetBars,
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
    formSheetBars: memory.formSheetBars ?? [],
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
  nowMs: number
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

  if (scoreMargin < SCALE_RETAIN_MARGIN || best.confidence < confidenceThreshold) {
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

  input.chordCandidates.slice(0, 4).forEach((candidate, index) => {
    recommendations.push(
      makeRecommendation(
        "chord",
        candidate,
        `Diatonic option ${index + 1} in ${scaleName}.`,
        Math.max(0.55, 0.83 - index * 0.08)
      )
    );
  });

  recommendations.push(
    makeRecommendation(
      "scale",
      scaleName,
      `Stable key inference from note-set weighting (${uniqueNotes(input.normalizedHistory).join(", ") || "insufficient notes"}).`,
      input.context.keyConfidence ?? 0.6
    )
  );

  if (input.formPatterns.length > 0) {
    const top = input.formPatterns[0];
    recommendations.push(
      makeRecommendation(
        "chord",
        top.signature,
        `Detected repeating form section ${top.label} (${top.occurrences}x).`,
        clamp(0.45 + top.occurrences * 0.08, 0, 0.92)
      )
    );
  }

  return uniqueRecommendations(recommendations).slice(0, 9);
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
