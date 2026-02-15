import { CompressedSection } from "@/types/studio";

const DEFAULT_SECTION_SIZE = 8;

export interface ExpandedToCompressedMapItem {
  expandedBarIndex: number;
  sectionId: string;
  localBar: number;
}

export interface ExpandedFormData {
  expandedBars: string[];
  expandedToCompressedMap: ExpandedToCompressedMapItem[];
}

export function compressExpandedBars(
  expandedBars: string[],
  options?: { sectionSize?: number }
): CompressedSection[] {
  if (expandedBars.length === 0) {
    return [];
  }

  const sectionSize = options?.sectionSize ?? deriveSectionSize(expandedBars.length);
  const chunks: string[][] = [];

  for (let i = 0; i < expandedBars.length; i += sectionSize) {
    chunks.push(expandedBars.slice(i, i + sectionSize));
  }

  const signatureToLabel = new Map<string, string>();
  let nextLabelCode = "A".charCodeAt(0);

  type Block = {
    label: string;
    bars: string[];
    repeatCount: number;
  };

  const blocks: Block[] = [];

  for (const chunk of chunks) {
    const signature = chunk.join("|");
    let label = signatureToLabel.get(signature);

    if (!label) {
      label = String.fromCharCode(nextLabelCode);
      nextLabelCode += 1;
      signatureToLabel.set(signature, label);
    }

    const previous = blocks[blocks.length - 1];
    if (previous && previous.label === label && areBarsEqual(previous.bars, chunk)) {
      previous.repeatCount += 1;
    } else {
      blocks.push({
        label,
        bars: chunk,
        repeatCount: 1,
      });
    }
  }

  return blocks.map((block, index) => ({
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

function deriveSectionSize(barCount: number): number {
  if (barCount % 8 === 0) {
    return 8;
  }

  if (barCount % 4 === 0) {
    return 4;
  }

  return DEFAULT_SECTION_SIZE;
}

function areBarsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
}
