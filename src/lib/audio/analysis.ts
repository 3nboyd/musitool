import Meyda from "meyda";
import { PitchDetector } from "pitchy";
import { BpmEstimator } from "@/lib/audio/bpm-estimator";
import { frequencyToNoteInfo, sanitizeFrequency } from "@/lib/audio/note";
import { AudioFrameFeature, AnalysisSource } from "@/types/studio";

const DEFAULT_WAVEFORM_POINTS = 256;
const DEFAULT_SPECTRUM_POINTS = 64;

interface AnalysisInput {
  timestampMs: number;
  source: AnalysisSource;
  timeDomain: Float32Array;
  frequencyDomain: Float32Array;
  sampleRate: number;
  pitchDetector: PitchDetector<Float32Array>;
  bpmEstimator: BpmEstimator;
}

export function extractFrameFeatures(input: AnalysisInput): AudioFrameFeature {
  const { timeDomain, frequencyDomain, sampleRate, timestampMs, pitchDetector, bpmEstimator } =
    input;

  const featureSet = Meyda.extract(["rms", "spectralCentroid"], timeDomain);
  const rms = typeof featureSet?.rms === "number" ? featureSet.rms : calculateRms(timeDomain);
  const centroid =
    typeof featureSet?.spectralCentroid === "number"
      ? featureSet.spectralCentroid
      : calculateSpectralCentroid(frequencyDomain, sampleRate);

  const peak = getPeak(timeDomain);
  const [pitchHzRaw, confidenceRaw] = pitchDetector.findPitch(timeDomain, sampleRate);

  const pitchHz = sanitizeFrequency(pitchHzRaw);
  const confidence = Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(1, confidenceRaw)) : 0;

  let note: string | null = null;
  let cents: number | null = null;

  if (pitchHz && confidence > 0.72 && pitchHz > 20) {
    const noteInfo = frequencyToNoteInfo(pitchHz);
    note = noteInfo.note;
    cents = noteInfo.cents;
  }

  const bpm = bpmEstimator.ingest(rms, timestampMs);

  return {
    ts: timestampMs,
    rms,
    peak,
    centroid,
    pitchHz,
    note,
    cents,
    confidence,
    bpm,
    waveform: downsample(timeDomain, DEFAULT_WAVEFORM_POINTS),
    spectrum: normalizeSpectrum(downsample(frequencyDomain, DEFAULT_SPECTRUM_POINTS)),
    source: input.source,
  };
}

function getPeak(buffer: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const abs = Math.abs(buffer[i]);
    if (abs > peak) {
      peak = abs;
    }
  }
  return peak;
}

function calculateRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

function calculateSpectralCentroid(frequencyDomain: Float32Array, sampleRate: number): number {
  const nyquist = sampleRate / 2;
  const binWidth = nyquist / frequencyDomain.length;

  let weighted = 0;
  let magnitudeSum = 0;

  for (let i = 0; i < frequencyDomain.length; i += 1) {
    const magnitude = dbToLinear(frequencyDomain[i]);
    const frequency = i * binWidth;
    weighted += magnitude * frequency;
    magnitudeSum += magnitude;
  }

  if (magnitudeSum === 0) {
    return 0;
  }

  return weighted / magnitudeSum;
}

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

function downsample(buffer: Float32Array, targetLength: number): number[] {
  if (buffer.length <= targetLength) {
    return Array.from(buffer);
  }

  const blockSize = Math.floor(buffer.length / targetLength);
  const out = new Array<number>(targetLength);

  for (let i = 0; i < targetLength; i += 1) {
    let sum = 0;
    const start = i * blockSize;
    const end = Math.min(buffer.length, start + blockSize);

    for (let index = start; index < end; index += 1) {
      sum += buffer[index];
    }

    const blockLength = Math.max(1, end - start);
    out[i] = sum / blockLength;
  }

  return out;
}

function normalizeSpectrum(values: number[]): number[] {
  return values.map((value) => {
    const normalized = (value + 140) / 140;
    return Math.max(0, Math.min(1, normalized));
  });
}
