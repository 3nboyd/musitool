export class BpmEstimator {
  private readonly onsetTimes: number[] = [];
  private readonly maxOnsets = 24;
  private lastOnsetTs = 0;
  private smoothedRms = 0;

  reset(): void {
    this.onsetTimes.length = 0;
    this.lastOnsetTs = 0;
    this.smoothedRms = 0;
  }

  ingest(rms: number, timestampMs: number): number | null {
    if (!Number.isFinite(rms)) {
      return this.estimate();
    }

    const baseline = this.smoothedRms;
    this.smoothedRms = baseline * 0.9 + rms * 0.1;

    const dynamicThreshold = Math.max(0.02, baseline * 0.45);
    const minOnsetGapMs = 140;

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
    if (this.onsetTimes.length < 4) {
      return null;
    }

    const histogram = new Map<number, number>();

    for (let i = 1; i < this.onsetTimes.length; i += 1) {
      const interval = this.onsetTimes[i] - this.onsetTimes[i - 1];
      if (interval <= 0) {
        continue;
      }

      const bpm = 60000 / interval;
      const normalized = normalizeTempo(bpm);
      if (normalized === null) {
        continue;
      }

      const rounded = Math.round(normalized);
      histogram.set(rounded, (histogram.get(rounded) ?? 0) + 1);
    }

    if (histogram.size === 0) {
      return null;
    }

    const best = [...histogram.entries()].sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
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
