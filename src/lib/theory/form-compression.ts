import { CompressedSection } from "@/types/studio";

const DEFAULT_SECTION_SIZE = 8;
const MAX_SECTION_SIZE = 24;
const MIN_SECTION_SIZE = 4;

export interface ExpandedToCompressedMapItem {
  expandedBarIndex: number;
  sectionId: string;
  localBar: number;
}

export interface ExpandedFormData {
  expandedBars: string[];
  expandedToCompressedMap: ExpandedToCompressedMapItem[];
}

interface CandidateResult {
  sectionSize: number;
  score: number;
  blocks: Array<{
    label: string;
    bars: string[];
    repeatCount: number;
  }>;
}

export function compressExpandedBars(
  expandedBars: string[],
  options?: { sectionSize?: number }
): CompressedSection[] {
  if (expandedBars.length === 0) {
    return [];
  }

  const sizes = options?.sectionSize
    ? [sanitizeSectionSize(options.sectionSize)]
    : deriveCandidateSectionSizes(expandedBars.length);

  let best = evaluateCandidate(expandedBars, sizes[0]);
  for (let i = 1; i < sizes.length; i += 1) {
    const candidate = evaluateCandidate(expandedBars, sizes[i]);
    if (candidate.score > best.score) {
      best = candidate;
      continue;
    }
    if (candidate.score === best.score && candidate.sectionSize > best.sectionSize) {
      best = candidate;
    }
  }

  return best.blocks.map((block, index) => ({
    id: `${block.label}-${index}`,
    label: block.label,
    bars: block.bars,
    repeatCount: block.repeatCount,
  }));
}

export function expandCompressedSections(sections: CompressedSection[]): ExpandedFormData {
  const expandedBars: string[] = [];
  const expandedToCompressedMap: ExpandedToCompressedMapItem[] = [];

  sections.forEach((section) => {
    for (let repeatIndex = 0; repeatIndex < section.repeatCount; repeatIndex += 1) {
      section.bars.forEach((bar, localBar) => {
        expandedToCompressedMap.push({
          expandedBarIndex: expandedBars.length,
          sectionId: section.id,
          localBar,
        });
        expandedBars.push(bar);
      });
    }
  });

  return {
    expandedBars,
    expandedToCompressedMap,
  };
}

export function mergeExpandedBars(existing: string[], detected: string[]): string[] {
  if (detected.length === 0) {
    return existing;
  }

  if (existing.length === 0) {
    return [...detected];
  }

  const merged = [...existing];

  for (let i = 0; i < detected.length; i += 1) {
    if (!merged[i] || merged[i] === "N.C.") {
      merged[i] = detected[i];
    }
  }

  if (detected.length > merged.length) {
    merged.push(...detected.slice(merged.length));
  }

  return merged;
}

export function unlinkRepeatInstance(
  sections: CompressedSection[],
  sectionId: string,
  repeatInstanceIndex: number
): CompressedSection[] {
  const out: CompressedSection[] = [];

  for (const section of sections) {
    if (section.id !== sectionId || section.repeatCount <= 1) {
      out.push(section);
      continue;
    }

    const target = Math.max(0, Math.min(repeatInstanceIndex, section.repeatCount - 1));
    const before = target;
    const after = section.repeatCount - target - 1;

    if (before > 0) {
      out.push({
        ...section,
        id: `${section.id}-pre`,
        repeatCount: before,
      });
    }

    out.push({
      ...section,
      id: `${section.id}-u${target}`,
      repeatCount: 1,
    });

    if (after > 0) {
      out.push({
        ...section,
        id: `${section.id}-post`,
        repeatCount: after,
      });
    }
  }

  return out.map((section, index) => ({
    ...section,
    id: `${section.label}-${index}-${section.id}`,
  }));
}

function evaluateCandidate(expandedBars: string[], sectionSize: number): CandidateResult {
  const chunks: string[][] = [];
  for (let i = 0; i < expandedBars.length; i += sectionSize) {
    chunks.push(expandedBars.slice(i, i + sectionSize));
  }

  const templates: Array<{
    label: string;
    bars: string[];
    normalized: string[];
  }> = [];
  const sections: Array<{
    label: string;
    bars: string[];
    normalized: string[];
    similarity: number;
  }> = [];

  let nextLabelCode = "A".charCodeAt(0);

  for (const chunk of chunks) {
    const normalizedChunk = chunk.map(normalizeBarToken);
    let bestTemplateIndex = -1;
    let bestSimilarity = 0;

    for (let i = 0; i < templates.length; i += 1) {
      const similarity = sectionSimilarity(normalizedChunk, templates[i].normalized);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestTemplateIndex = i;
      }
    }

    const threshold = similarityThreshold(sectionSize, chunk.length);
    if (bestTemplateIndex >= 0 && bestSimilarity >= threshold) {
      const template = templates[bestTemplateIndex];
      sections.push({
        label: template.label,
        bars: template.bars,
        normalized: template.normalized,
        similarity: bestSimilarity,
      });
      continue;
    }

    const label = String.fromCharCode(nextLabelCode);
    nextLabelCode += 1;
    templates.push({
      label,
      bars: [...chunk],
      normalized: normalizedChunk,
    });
    sections.push({
      label,
      bars: [...chunk],
      normalized: normalizedChunk,
      similarity: 1,
    });
  }

  const blocks: Array<{ label: string; bars: string[]; repeatCount: number }> = [];
  sections.forEach((section) => {
    const previous = blocks[blocks.length - 1];
    if (!previous) {
      blocks.push({
        label: section.label,
        bars: section.bars,
        repeatCount: 1,
      });
      return;
    }

    const compatible =
      previous.label === section.label &&
      sectionSimilarity(
        previous.bars.map(normalizeBarToken),
        section.normalized
      ) >= 0.7;
    if (compatible) {
      previous.repeatCount += 1;
      return;
    }

    blocks.push({
      label: section.label,
      bars: section.bars,
      repeatCount: 1,
    });
  });

  const sectionCount = Math.max(sections.length, 1);
  const uniqueCount = Math.max(new Set(sections.map((section) => section.label)).size, 1);
  const repeatedSections = Math.max(0, sectionCount - uniqueCount);
  const repeatCoverage = repeatedSections / sectionCount;
  const matched = sections.filter((section) => section.similarity < 0.999);
  const avgMatchSimilarity =
    matched.length > 0 ? matched.reduce((sum, item) => sum + item.similarity, 0) / matched.length : 0;
  const remainder = expandedBars.length % sectionSize;
  const remainderPenalty = remainder === 0 ? 0 : (sectionSize - remainder) / sectionSize;
  const sizePreference = sectionSize >= 8 && sectionSize <= 16 ? 0.12 : 0;
  const shortSectionPenalty = sectionSize < 8 ? (8 - sectionSize) * 0.25 : 0;
  const blockComplexityPenalty = Math.max(0, blocks.length - 6) * 0.035;

  const score =
    repeatCoverage * 2.2 +
    avgMatchSimilarity * 1.25 +
    (1 - remainderPenalty) * 0.45 +
    sizePreference -
    uniqueCount * 0.015 -
    shortSectionPenalty -
    blockComplexityPenalty;

  return {
    sectionSize,
    score,
    blocks,
  };
}

function deriveCandidateSectionSizes(barCount: number): number[] {
  const preferred = [8, 12, 14, 16, 4, 20, 24];
  const sizes: number[] = [];

  for (const size of preferred) {
    if (size > barCount || size < MIN_SECTION_SIZE || size > MAX_SECTION_SIZE) {
      continue;
    }
    sizes.push(size);
  }

  if (barCount < 8) {
    sizes.push(Math.max(MIN_SECTION_SIZE, barCount));
  }

  if (sizes.length === 0) {
    sizes.push(Math.min(sanitizeSectionSize(DEFAULT_SECTION_SIZE), barCount));
  }

  return [...new Set(sizes)].sort((a, b) => a - b);
}

function sanitizeSectionSize(value: number): number {
  const rounded = Math.round(value) || DEFAULT_SECTION_SIZE;
  return Math.max(MIN_SECTION_SIZE, Math.min(MAX_SECTION_SIZE, rounded));
}

function similarityThreshold(sectionSize: number, chunkLength: number): number {
  if (chunkLength < Math.max(4, sectionSize * 0.75)) {
    return 0.84;
  }
  if (sectionSize >= 12) {
    return 0.73;
  }
  if (sectionSize >= 8) {
    return 0.76;
  }
  return 0.82;
}

function sectionSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const max = Math.max(left.length, right.length);
  const min = Math.min(left.length, right.length);
  let score = 0;

  for (let i = 0; i < min; i += 1) {
    score += barSimilarity(left[i], right[i]);
  }

  const lengthPenalty = (max - min) / max;
  return clamp(score / max - lengthPenalty * 0.2, 0, 1);
}

function barSimilarity(left: string, right: string): number {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) {
    return 0;
  }
  if (a.toLowerCase() === b.toLowerCase()) {
    return 1;
  }

  const parsedA = parseToken(a);
  const parsedB = parseToken(b);
  if (parsedA.normalized === parsedB.normalized) {
    return 0.9;
  }
  if (parsedA.root === parsedB.root && parsedA.quality === parsedB.quality) {
    return 0.76;
  }
  if (parsedA.root === parsedB.root) {
    return 0.64;
  }
  if (parsedA.quality === parsedB.quality) {
    return 0.42;
  }
  return 0;
}

function normalizeBarToken(value: string): string {
  return parseToken(value).normalized;
}

function parseToken(value: string): {
  root: string;
  quality: string;
  extension: string;
  normalized: string;
} {
  const compact = value.replace(/\s+/g, "");
  const match = compact.match(/^([A-G](?:#|b)?)/i);
  const root = match ? match[1].toUpperCase() : "NC";
  const suffix = compact.replace(/^([A-G](?:#|b)?)/i, "").toLowerCase();

  let quality = "triad";
  if (suffix.includes("m7b5") || suffix.includes("ø")) {
    quality = "half-dim";
  } else if (suffix.includes("dim") || suffix.includes("o")) {
    quality = "dim";
  } else if (suffix.includes("maj")) {
    quality = "maj";
  } else if (suffix.startsWith("m") || suffix.includes("min")) {
    quality = "min";
  } else if (suffix.includes("sus")) {
    quality = "sus";
  } else if (suffix.includes("7")) {
    quality = "dom";
  }

  let extension = "";
  if (suffix.includes("13")) {
    extension = "13";
  } else if (suffix.includes("11")) {
    extension = "11";
  } else if (suffix.includes("9")) {
    extension = "9";
  } else if (suffix.includes("7")) {
    extension = "7";
  } else if (suffix.includes("6")) {
    extension = "6";
  }

  return {
    root,
    quality,
    extension,
    normalized: `${root}:${quality}:${extension}`,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
