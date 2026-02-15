export function formatHz(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${value.toFixed(2)} Hz`;
}

export function formatDbLike(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

export function formatBpm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return `${Math.round(value)} BPM`;
}

export function formatCents(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded} cents`;
}

export function formatTimeAgo(epochMs: number): string {
  const delta = Date.now() - epochMs;
  if (delta < 60_000) {
    return "just now";
  }
  if (delta < 3_600_000) {
    return `${Math.round(delta / 60_000)}m ago`;
  }
  return `${Math.round(delta / 3_600_000)}h ago`;
}
