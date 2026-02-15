export class BpmEstimator {
  private readonly onsetTimes: number[] = [];
  private readonly maxOnsets = 40;
  private lastOnsetTs = 0;
  private smoothedRms = 0;
  private stableBpm: number | null = null;

  reset(): void {
    this.onsetTimes.length = 0;
    this.lastOnsetTs = 0;
    this.smoothedRms = 0;
    this.stableBpm = null;
  }

  ingest(rms: number, timestampMs: number): number | null {
    if (!Number.isFinite(rms)) {
      return this.estimate();
    }

    const baseline = this.smoothedRms;
    this.smoothedRms = baseline * 0.9 + rms * 0.1;

    const dynamicThreshold = Math.max(0.016, baseline * 0.36);
    const minOnsetGapMs = 170;

    if (
      rms - baseline > dynamicThreshold &&
      timestampMs - this.lastOnsetTs > minOnsetGapMs
    ) {
      this.lastOnsetTs = timestampMs;
      this.onsetTimes.push(timestampMs);
      if (this.onsetTimes.length > this.maxOnsets) {
        this.onsetTimes.shift();
      }
    }

    return this.estimate();
  }

  estimate(): number | null {
    if (this.onsetTimes.length < 5) {
      return this.stableBpm;
    }

    const histogram = new Map<number, number>();
    const candidates: Array<{ bpm: number; weight: number }> = [];

    for (let i = 1; i < this.onsetTimes.length; i += 1) {
      for (let span = 1; span <= 6; span += 1) {
        const j = i - span;
        if (j < 0) {
          break;
        }

        const interval = this.onsetTimes[i] - this.onsetTimes[j];
        if (interval <= 0) {
          continue;
        }

        const intervalPerBeat = interval / span;
        const bpm = 60000 / intervalPerBeat;
        const normalized = normalizeTempo(bpm);
        if (normalized === null) {
          continue;
        }

        const weight = 1 + span * 0.42;
        const rounded = roundTo(normalized, 0.5);
        histogram.set(rounded, (histogram.get(rounded) ?? 0) + weight);
        candidates.push({ bpm: normalized, weight });
      }
    }

    if (histogram.size === 0 || candidates.length === 0) {
      return this.stableBpm;
    }

    const ranked = [...histogram.entries()].sort((a, b) => b[1] - a[1]);
    const best = ranked[0];
    if (!best) {
      return this.stableBpm;
    }

    const totalWeight = ranked.reduce((sum, [, weight]) => sum + weight, 0);
    const confidence = best[1] / Math.max(totalWeight, 0.0001);
    const meanAroundPeak = weightedAverage(
      candidates.filter((candidate) => Math.abs(candidate.bpm - best[0]) <= 1.1)
    );
    const targetBpm = Number.isFinite(meanAroundPeak) ? meanAroundPeak : best[0];

    if (this.stableBpm === null) {
      this.stableBpm = targetBpm;
      return roundTo(this.stableBpm, 0.1);
    }

    const delta = Math.abs(targetBpm - this.stableBpm);
    let blend = 0.18;
    if (delta <= 0.6) {
      blend = 0.3;
    } else if (delta <= 1.8) {
      blend = 0.22;
    } else if (confidence > 0.48) {
      blend = 0.15;
    } else {
      blend = 0.08;
    }

    this.stableBpm = this.stableBpm * (1 - blend) + targetBpm * blend;
    return roundTo(this.stableBpm, 0.1);
  }
}

function normalizeTempo(bpm: number): number | null {
  if (!Number.isFinite(bpm)) {
    return null;
  }

  let normalized = bpm;
  while (normalized < 60) {
    normalized *= 2;
  }
  while (normalized > 190) {
    normalized /= 2;
  }

  if (normalized < 60 || normalized > 220) {
    return null;
  }

  return normalized;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function weightedAverage(values: Array<{ bpm: number; weight: number }>): number {
  if (values.length === 0) {
    return Number.NaN;
  }

  let weighted = 0;
  let total = 0;
  for (const value of values) {
    weighted += value.bpm * value.weight;
    total += value.weight;
  }

  if (total <= 0) {
    return Number.NaN;
  }

  return weighted / total;
}
