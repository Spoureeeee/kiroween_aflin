export function daysBetween(earlier: string, later: string): number {
  const parts1 = earlier.split("-");
  const parts2 = later.split("-");
  const y1 = Number(parts1[0]);
  const m1 = Number(parts1[1]);
  const d1 = Number(parts1[2]);
  const y2 = Number(parts2[0]);
  const m2 = Number(parts2[1]);
  const d2 = Number(parts2[2]);
  return Math.round(
    (Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000
  );
}

export function computeGaps(dates: readonly string[]): number[] {
  if (dates.length < 2) return [];
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const prev = dates[i - 1] as string;
    const curr = dates[i] as string;
    gaps.push(daysBetween(prev, curr));
  }
  return gaps;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    // Even-length: return the lower of the two middle values
    return sorted[mid - 1] ?? null;
  }
  return sorted[mid] ?? null;
}
