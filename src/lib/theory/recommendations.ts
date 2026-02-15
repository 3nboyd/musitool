import { Chord, Interval, Note, Scale } from "@tonaljs/tonal";
import { stripOctave } from "@/lib/audio/note";
import { TheoryContext, TheoryRecommendation } from "@/types/studio";

const ROOTS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SCALES = ["major", "minor", "dorian", "mixolydian", "lydian", "phrygian"];

export function buildTheoryContext(noteHistory: string[], bpm: number | null): TheoryContext {
  const latest = noteHistory.length > 0 ? noteHistory[noteHistory.length - 1] : null;
  const normalized = noteHistory.map(stripOctave);

  const best = guessScale(normalized);
  const chordGuess = guessChord(normalized, best.keyGuess, best.scaleGuess);

  return {
    note: latest,
    keyGuess: best.keyGuess,
    scaleGuess: best.scaleGuess,
    chordGuess,
    bpm,
  };
}

export function getTheoryRecommendations(
  context: TheoryContext,
  noteHistory: string[]
): TheoryRecommendation[] {
  const current = context.note ? stripOctave(context.note) : null;
  const scaleName = `${context.keyGuess} ${context.scaleGuess}`;
  const scale = Scale.get(scaleName);
  const scaleNotes = scale.notes.length > 0 ? scale.notes : Scale.get("C major").notes;

  const recommendations: TheoryRecommendation[] = [];

  if (current) {
    const idx = scaleNotes.indexOf(current);
    const next = idx >= 0 ? scaleNotes[(idx + 1) % scaleNotes.length] : scaleNotes[0];
    const third = idx >= 0 ? scaleNotes[(idx + 2) % scaleNotes.length] : scaleNotes[2];
    const fifth = idx >= 0 ? scaleNotes[(idx + 4) % scaleNotes.length] : scaleNotes[4];

    recommendations.push(
      makeRecommendation("note", next, `Stepwise motion from ${current} in ${scaleName}.`, 0.92),
      makeRecommendation("note", third, `Color tone a third above ${current}.`, 0.84),
      makeRecommendation("note", fifth, `Stable fifth relationship against ${current}.`, 0.8)
    );
  } else {
    recommendations.push(
      makeRecommendation("note", scaleNotes[0], `Start on tonic of ${scaleName}.`, 0.78),
      makeRecommendation("note", scaleNotes[4], `Dominant for strong tonal gravity.`, 0.7)
    );
  }

  const chordCandidates = buildChordCandidates(context.keyGuess, context.scaleGuess);
  chordCandidates.forEach((candidate, index) => {
    recommendations.push(
      makeRecommendation(
        "chord",
        candidate,
        `Functional harmony option ${index + 1} in ${scaleName}.`,
        Math.max(0.55, 0.88 - index * 0.09)
      )
    );
  });

  recommendations.push(
    makeRecommendation(
      "scale",
      scaleName,
      `Detected by matching recent note set (${uniqueNotes(noteHistory).join(", ") || "insufficient notes"
      }).`,
      scaleNotes.length > 0 ? 0.76 : 0.5
    )
  );

  return recommendations.slice(0, 8);
}

export function buildCircleOfFifths(root = "C"): string[] {
  const notes: string[] = [root];
  let current = root;

  for (let i = 0; i < 11; i += 1) {
    current = Note.transpose(current, "5P");
    notes.push(Note.simplify(current));
  }

  return notes;
}

function guessScale(noteHistory: string[]): Pick<TheoryContext, "keyGuess" | "scaleGuess"> {
  if (noteHistory.length === 0) {
    return {
      keyGuess: "C",
      scaleGuess: "major",
    };
  }

  let bestScore = -1;
  let best = { keyGuess: "C", scaleGuess: "major" };

  const unique = uniqueNotes(noteHistory);

  for (const root of ROOTS) {
    for (const scaleType of SCALES) {
      const scale = Scale.get(`${root} ${scaleType}`);
      if (scale.notes.length === 0) {
        continue;
      }

      let score = 0;
      for (const note of unique) {
        if (scale.notes.includes(note)) {
          score += 1;
        }
      }

      const tonicBoost = noteHistory[noteHistory.length - 1] === root ? 0.6 : 0;
      score += tonicBoost;

      if (score > bestScore) {
        bestScore = score;
        best = { keyGuess: root, scaleGuess: scaleType };
      }
    }
  }

  return best;
}

function guessChord(notes: string[], key: string, scale: string): string {
  const candidates = buildChordCandidates(key, scale);
  if (notes.length === 0) {
    return candidates[0];
  }

  const latest = notes[notes.length - 1];
  const withMatch = candidates.find((name) => Chord.get(name).notes.includes(latest));
  return withMatch ?? candidates[0];
}

function buildChordCandidates(key: string, scale: string): string[] {
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

function uniqueNotes(noteHistory: string[]): string[] {
  const normalized = noteHistory.map(stripOctave).filter(Boolean);
  return [...new Set(normalized)];
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
    confidence,
  };
}

export function distanceBetweenNotes(a: string, b: string): string {
  return Interval.distance(stripOctave(a), stripOctave(b));
}
