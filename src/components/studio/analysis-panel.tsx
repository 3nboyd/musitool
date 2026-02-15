import { useEffect, useMemo, useRef, useState } from "react";
import { Note, Scale } from "@tonaljs/tonal";
import { BearMascot } from "@/components/studio/bear-mascot";
import { Panel } from "@/components/ui/panel";
import { ScopeCanvas } from "@/components/studio/scope-canvas";
import { TunerMeter } from "@/components/studio/tuner-meter";
import {
  AudioFrameFeature,
  TheoryContext,
  TheoryMemory,
  TheoryRecommendation,
  TunerSettings,
  TunerTemperament,
  TunerTolerancePreset,
} from "@/types/studio";
import { formatHz } from "@/lib/format";

interface AnalysisPanelProps {
  frame: AudioFrameFeature | null;
  theoryContext: TheoryContext;
  theoryMemory: TheoryMemory;
  recommendations: TheoryRecommendation[];
  tunerSettings: TunerSettings;
  onUpdateTunerSettings: (update: Partial<TunerSettings>) => void;
  onSetKeyControlMode: (mode: TheoryMemory["keyControlMode"]) => void;
  onSetAutoDetectKeyChanges: (value: boolean) => void;
  onSetManualKeyScale: (key: string, scale: string) => void;
}

type LaneKind = "scale" | "arp";
type LaneState = "active" | "cooling";

interface IncomingLane {
  key: string;
  label: string;
  reason: string;
  confidence: number;
  notes: string[];
  kind: LaneKind;
  order: number;
}

interface DisplayLane extends IncomingLane {
  state: LaneState;
  cooldownStartedAt: number | null;
  cooldownProgress: number;
}

const COOLDOWN_DURATION_MS = 18000;

const TOLERANCE_PROFILES: Record<
  TunerTolerancePreset,
  { label: string; greenRangeCents: number; yellowRangeCents: number }
> = {
  tight: { label: "Tight (+/-3c)", greenRangeCents: 3, yellowRangeCents: 8 },
  standard: { label: "Standard (+/-6c)", greenRangeCents: 6, yellowRangeCents: 14 },
  relaxed: { label: "Relaxed (+/-10c)", greenRangeCents: 10, yellowRangeCents: 20 },
};

const TEMPERAMENT_LABELS: Record<TunerTemperament, string> = {
  equal: "Equal",
  just: "Just",
  pythagorean: "Pythagorean",
};

const A4_OPTIONS = [432, 438, 440, 442, 444];
const ROOT_OPTIONS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const MANUAL_SCALE_OPTIONS = [
  "major",
  "minor",
  "dorian",
  "mixolydian",
  "lydian",
  "phrygian",
  "locrian",
  "melodic minor",
  "harmonic minor",
];

export function AnalysisPanel({
  frame,
  theoryContext,
  theoryMemory,
  recommendations,
  tunerSettings,
  onUpdateTunerSettings,
  onSetKeyControlMode,
  onSetAutoDetectKeyChanges,
  onSetManualKeyScale,
}: AnalysisPanelProps) {
  const rawScaleLanes = useMemo(
    () => recommendations.filter((item) => item.type === "scale").slice(0, 5),
    [recommendations]
  );
  const featuredArpLane = useMemo(
    () =>
      buildFeaturedArpLane({
        keyGuess: theoryContext.keyGuess,
        scaleGuess: theoryContext.scaleGuess,
        formSectionLabel: theoryContext.formSectionLabel ?? null,
      }),
    [theoryContext.formSectionLabel, theoryContext.keyGuess, theoryContext.scaleGuess]
  );
  const compactRecommendations = useMemo(
    () => recommendations.filter((item) => item.type !== "scale").slice(0, 6),
    [recommendations]
  );
  const incomingLanes = useMemo(() => {
    const scaleLanes: IncomingLane[] = rawScaleLanes.map((lane, index) => ({
      key: `scale-${lane.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: lane.label,
      reason: lane.reason,
      confidence: lane.confidence,
      notes: notesFromScale(lane.label),
      kind: "scale",
      order: index + 1,
    }));

    return [featuredArpLane, ...scaleLanes];
  }, [featuredArpLane, rawScaleLanes]);
  const lastBearNoteRef = useRef<string | null>(null);
  const [bearPulse, setBearPulse] = useState(0);
  const [displayLanes, setDisplayLanes] = useState<DisplayLane[]>(() =>
    incomingLanes.map((lane) => ({
      ...lane,
      state: "active",
      cooldownStartedAt: null,
      cooldownProgress: 0,
    }))
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDisplayLanes((previous) => mergeScaleLanes(previous, incomingLanes));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [incomingLanes]);

  useEffect(() => {
    const note = frame?.note ?? null;
    if (!note || note === lastBearNoteRef.current) {
      return;
    }

    lastBearNoteRef.current = note;
    const kickoff = window.requestAnimationFrame(() => setBearPulse(1));

    const t1 = window.setTimeout(() => setBearPulse(0.65), 260);
    const t2 = window.setTimeout(() => setBearPulse(0.32), 920);
    const t3 = window.setTimeout(() => setBearPulse(0), 2200);

    return () => {
      window.cancelAnimationFrame(kickoff);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [frame?.note]);

  return (
    <Panel title="Signal Lab">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Tuner</p>
          <div className="mx-auto max-w-[360px]">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/70">
              <div className="pointer-events-none absolute left-1/2 top-0 z-30 -translate-x-1/2 -translate-y-[18%]">
                <BearMascot pulse={bearPulse} />
              </div>
              <ScopeCanvas
                data={frame?.waveform ?? []}
                width={420}
                height={420}
                className="h-full w-full border-none bg-transparent"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[66%] max-w-[220px]">
                  <TunerMeter
                    cents={frame?.cents ?? null}
                    note={frame?.note ?? null}
                    greenRange={tunerSettings.greenRangeCents}
                    yellowRange={tunerSettings.yellowRangeCents}
                  />
                </div>
              </div>

              <div className="absolute left-2 top-2 z-20">
                <select
                  value={tunerSettings.tolerancePreset}
                  onChange={(event) => {
                    const preset = event.target.value as TunerTolerancePreset;
                    const profile = TOLERANCE_PROFILES[preset];
                    onUpdateTunerSettings({
                      tolerancePreset: preset,
                      greenRangeCents: profile.greenRangeCents,
                      yellowRangeCents: profile.yellowRangeCents,
                    });
                  }}
                  className="h-8 w-32 rounded border border-slate-700 bg-slate-900/95 px-1 text-[11px] text-slate-100"
                >
                  {(Object.keys(TOLERANCE_PROFILES) as TunerTolerancePreset[]).map((preset) => (
                    <option key={preset} value={preset}>
                      {TOLERANCE_PROFILES[preset].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="absolute right-2 top-2 z-20">
                <select
                  value={tunerSettings.temperament}
                  onChange={(event) =>
                    onUpdateTunerSettings({
                      temperament: event.target.value as TunerTemperament,
                    })
                  }
                  className="h-8 w-32 rounded border border-slate-700 bg-slate-900/95 px-1 text-[11px] text-slate-100"
                >
                  {(Object.keys(TEMPERAMENT_LABELS) as TunerTemperament[]).map((temperament) => (
                    <option key={temperament} value={temperament}>
                      {TEMPERAMENT_LABELS[temperament]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="absolute bottom-2 left-2 z-20">
                <select
                  value={tunerSettings.a4Hz}
                  onChange={(event) =>
                    onUpdateTunerSettings({
                      a4Hz: Number(event.target.value) || 440,
                    })
                  }
                  className="h-8 w-32 rounded border border-slate-700 bg-slate-900/95 px-1 text-[11px] text-slate-100"
                >
                  {A4_OPTIONS.map((hz) => (
                    <option key={hz} value={hz}>
                      {hz} Hz
                    </option>
                  ))}
                </select>
              </div>

              <div className="pointer-events-none absolute bottom-2 right-2 z-20 h-16 w-32 rounded-md border border-slate-700/90 bg-slate-950/90 p-1.5">
                <p className="mt-0.5 truncate text-sm font-semibold text-slate-100">
                  {formatHz(frame?.pitchHz ?? null)}
                </p>
                <p className="mt-1 text-[11px] text-slate-300">{frame?.note ?? "--"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Theory Assistant</p>
          <div className="mt-2 grid gap-2">
            <label className="text-xs text-slate-300">
              Detection Mode
              <select
                value={theoryMemory.keyControlMode}
                onChange={(event) =>
                  onSetKeyControlMode(event.target.value as TheoryMemory["keyControlMode"])
                }
                className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              >
                <option value="auto">Auto-Detect</option>
                <option value="manual">Manual</option>
              </select>
            </label>

            {theoryMemory.keyControlMode === "auto" ? (
              <label className="flex items-center gap-2 rounded border border-slate-800 bg-slate-900/60 px-2 py-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={theoryMemory.autoDetectKeyChanges}
                  onChange={(event) => onSetAutoDetectKeyChanges(event.target.checked)}
                />
                Auto-detect key changes
              </label>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-300">
                  Key
                  <select
                    value={theoryMemory.manualKey}
                    onChange={(event) => onSetManualKeyScale(event.target.value, theoryMemory.manualScale)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  >
                    {ROOT_OPTIONS.map((root) => (
                      <option key={root} value={root}>
                        {root}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-300">
                  Scale
                  <select
                    value={theoryMemory.manualScale}
                    onChange={(event) => onSetManualKeyScale(theoryMemory.manualKey, event.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                  >
                    {MANUAL_SCALE_OPTIONS.map((scale) => (
                      <option key={scale} value={scale}>
                        {scale}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <MiniMeta label="Key / Scale" value={`${theoryContext.keyGuess} ${theoryContext.scaleGuess}`} />
            <MiniMeta label="Chord" value={theoryContext.chordGuess} />
            <MiniMeta label="Section" value={theoryContext.formSectionLabel ?? "--"} />
            <MiniMeta
              label="Confidence"
              value={theoryContext.keyConfidence ? `${Math.round(theoryContext.keyConfidence * 100)}%` : "--"}
            />
          </div>

          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Note / Chord Prompts</p>
            {compactRecommendations.length === 0 ? (
              <p className="mt-1 text-xs text-slate-400">Waiting for stable phrase context.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {compactRecommendations.map((item, index) => (
                  <span
                    key={`${item.id}-${index}`}
                    className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-200"
                    title={item.reason}
                  >
                    {item.type}: {item.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-500">Improv Scale Lanes</p>
        {displayLanes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">
            Start audio or MIDI input to build stable scale lanes for this form section.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {displayLanes.map((lane) => (
              <div
                key={lane.key}
                className={`rounded-lg border p-2 transition-all duration-[2200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  lane.state === "cooling"
                    ? "border-slate-800/70 bg-slate-900/45"
                    : "border-slate-800 bg-slate-900/70 opacity-100"
                }`}
                style={
                  lane.state === "cooling"
                    ? {
                        opacity: 1 - lane.cooldownProgress * 0.75,
                        transform: `translateY(${(lane.cooldownProgress * 12).toFixed(2)}px)`,
                      }
                    : undefined
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                      lane.kind === "arp"
                        ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200"
                        : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
                    }`}
                  >
                    {lane.kind}
                  </span>
                  <span className="text-sm font-medium text-slate-100">{lane.label}</span>
                  <span className="text-xs text-slate-400">{Math.round(lane.confidence * 100)}%</span>
                  {lane.notes.slice(0, 8).map((note) => (
                    <span
                      key={`${lane.key}-${note}`}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-200"
                    >
                      {note}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-xs text-slate-400">{lane.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function MiniMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function mergeScaleLanes(previous: DisplayLane[], incoming: IncomingLane[]): DisplayLane[] {
  const nowMs = Date.now();
  const previousByKey = new Map(previous.map((lane) => [lane.key, lane]));
  const seen = new Set<string>();
  const next: DisplayLane[] = [];

  incoming.forEach((lane, index) => {
    const prior = previousByKey.get(lane.key);
    seen.add(lane.key);
    next.push({
      ...lane,
      order: index,
      state: "active",
      cooldownStartedAt: null,
      cooldownProgress: 0,
      confidence: blendConfidence(prior?.confidence ?? lane.confidence, lane.confidence, 0.2),
    });
  });

  previous.forEach((lane) => {
    if (seen.has(lane.key)) {
      return;
    }

    const cooldownStartedAt = lane.cooldownStartedAt ?? nowMs;
    const cooldownProgress = clamp((nowMs - cooldownStartedAt) / COOLDOWN_DURATION_MS, 0, 1);
    const confidence = clamp(lane.confidence * 0.88, 0, 1);
    if (cooldownProgress >= 1 || confidence < 0.16) {
      return;
    }

    next.push({
      ...lane,
      state: "cooling",
      cooldownStartedAt,
      cooldownProgress,
      order: incoming.length + Math.round(cooldownProgress * 100),
      confidence: clamp(confidence * (1 - cooldownProgress * 0.65), 0, 1),
    });
  });

  return next.sort((a, b) => {
    if (a.state !== b.state) {
      return a.state === "active" ? -1 : 1;
    }
    if (a.state === "active") {
      return a.order - b.order;
    }
    if (a.cooldownProgress !== b.cooldownProgress) {
      return a.cooldownProgress - b.cooldownProgress;
    }
    return a.order - b.order;
  });
}

function buildFeaturedArpLane(context: {
  keyGuess: string;
  scaleGuess: string;
  formSectionLabel: string | null;
}): IncomingLane {
  const root = context.keyGuess || "C";
  const quality = scaleQuality(context.scaleGuess);

  let label = `${root} major #4 arpeggio line`;
  let reason = "Lydian-style #4 color line for bright modern phrasing.";
  let intervals = ["1P", "3M", "4A", "5P", "7M", "9M"];

  if (quality === "dominant") {
    label = `${root} dominant #4 arpeggio line`;
    reason = "Classic dominant tension cell (3-#4-5-b7) for altered-to-inside release.";
    intervals = ["1P", "3M", "4A", "5P", "7m", "9M"];
  } else if (quality === "minor") {
    label = `${root} minor 9 arpeggio line`;
    reason = "Minor 9 arpeggio cell for melodic, inside modern jazz phrasing.";
    intervals = ["1P", "3m", "5P", "7m", "9M", "11P"];
  } else if (quality === "half-diminished") {
    label = `${root} m7b5 chromatic arp line`;
    reason = "Half-diminished cell with b5 and b7 for ii-V minor resolution color.";
    intervals = ["1P", "3m", "5d", "7m", "9m", "11P"];
  }

  return {
    key: `arp-${root}-${quality}`,
    label,
    reason,
    confidence: 0.72,
    notes: buildNotesFromIntervals(root, intervals),
    kind: "arp",
    order: 0,
  };
}

function buildNotesFromIntervals(root: string, intervals: string[]): string[] {
  return intervals
    .map((interval) => Note.simplify(Note.transpose(root, interval)))
    .filter((note) => note.length > 0);
}

function scaleQuality(scaleGuess: string): "major" | "minor" | "dominant" | "half-diminished" {
  const token = scaleGuess.toLowerCase();
  if (token.includes("locrian")) {
    return "half-diminished";
  }
  if (token.includes("mixolydian")) {
    return "dominant";
  }
  if (token.includes("minor") || token.includes("dorian") || token.includes("phrygian")) {
    return "minor";
  }
  return "major";
}

function notesFromScale(scaleLabel: string): string[] {
  return Scale.get(scaleLabel).notes.slice(0, 8);
}

function blendConfidence(previous: number, next: number, weight: number): number {
  const factor = clamp(weight, 0, 1);
  return previous * (1 - factor) + next * factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
