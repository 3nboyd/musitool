import { CompressedSection } from "@/types/studio";

interface ExportChartInput {
  name: string;
  keyLabel: string;
  expandedBars: string[];
  compressedSections: CompressedSection[];
  condensed: boolean;
}

type ExportFormat = "txt" | "pdf" | "ireal" | "musicxml";

export async function exportChart(input: ExportChartInput, format: ExportFormat): Promise<void> {
  switch (format) {
    case "txt":
      downloadTextFile(`${slug(input.name)}-chart.txt`, buildTxtChart(input));
      return;
    case "ireal":
      downloadTextFile(`${slug(input.name)}-chart.ireal.txt`, buildIRealPayload(input));
      return;
    case "musicxml":
      downloadTextFile(`${slug(input.name)}-chart.musicxml`, buildMusicXml(input));
      return;
    case "pdf":
      await downloadPdf(input);
      return;
    default:
      return;
  }
}

function buildTxtChart(input: ExportChartInput): string {
  const lines: string[] = [];
  lines.push(`${input.name} - Chord Chart`);
  lines.push(`Key: ${input.keyLabel}`);
  lines.push("");

  const bars = input.condensed ? expandCompressedWithRepeats(input.compressedSections) : input.expandedBars;
  barsToRows(bars, 4).forEach((row) => {
    lines.push(`| ${row.join(" | ")} |`);
  });

  if (input.condensed) {
    lines.push("");
    lines.push("Condensed form sections:");
    input.compressedSections.forEach((section) => {
      lines.push(`${section.label}: ${section.bars.join(" | ")} x${section.repeatCount}`);
    });
  }

  return lines.join("\n");
}

function buildIRealPayload(input: ExportChartInput): string {
  const bars = input.condensed ? expandCompressedWithRepeats(input.compressedSections) : input.expandedBars;
  const barString = bars.map((bar) => bar || "N.C.").join(" | ");

  return [
    "IREALPRO_SIMPLIFIED",
    `TITLE:${input.name}`,
    `KEY:${input.keyLabel}`,
    `CHORDS:${barString}`,
  ].join("\n");
}

function buildMusicXml(input: ExportChartInput): string {
  const bars = input.condensed ? expandCompressedWithRepeats(input.compressedSections) : input.expandedBars;
  const measures = bars
    .map((bar, index) => {
      const { root, kind } = parseChordForMusicXml(bar || "N.C.");
      const harmony =
        root === "N.C."
          ? ""
          : `<harmony><root><root-step>${root}</root-step></root><kind>${kind}</kind></harmony>`;

      return `<measure number="${index + 1}">${harmony}<note><rest/><duration>4</duration><type>whole</type></note></measure>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Chord Chart</part-name></score-part>
  </part-list>
  <part id="P1">
    ${measures}
  </part>
</score-partwise>`;
}

async function downloadPdf(input: ExportChartInput): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const lines = buildTxtChart({
    ...input,
    condensed: input.condensed,
  }).split("\n");

  doc.setFontSize(12);
  let y = 12;
  lines.forEach((line) => {
    doc.text(line, 10, y);
    y += 6;
    if (y > 280) {
      doc.addPage();
      y = 12;
    }
  });

  doc.save(`${slug(input.name)}-chart.pdf`);
}

function barsToRows(bars: string[], perRow: number): string[][] {
  const rows: string[][] = [];
  for (let i = 0; i < bars.length; i += perRow) {
    rows.push(bars.slice(i, i + perRow).map((bar) => bar || "N.C."));
  }
  return rows;
}

function expandCompressedWithRepeats(sections: CompressedSection[]): string[] {
  const bars: string[] = [];
  sections.forEach((section) => {
    for (let i = 0; i < section.repeatCount; i += 1) {
      bars.push(...section.bars);
    }
  });
  return bars;
}

function parseChordForMusicXml(chord: string): { root: string; kind: string } {
  if (!chord || chord === "N.C.") {
    return { root: "N.C.", kind: "none" };
  }

  const match = chord.match(/^([A-G])(b|#)?(.*)$/);
  if (!match) {
    return { root: "C", kind: "major" };
  }

  const baseRoot = match[1];
  const accidental = match[2] ?? "";
  const quality = match[3] ?? "";

  const root = accidental === "" ? baseRoot : `${baseRoot}`;
  let kind = "major";

  if (/dim/i.test(quality)) {
    kind = "diminished";
  } else if (/m(?!aj)/i.test(quality)) {
    kind = "minor";
  } else if (/7/.test(quality)) {
    kind = "dominant";
  }

  return { root, kind };
}

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
