export function percentFromParts(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  if (numerator == null || denominator == null || Number(denominator) === 0) return null;
  return Math.round((Number(numerator) / Number(denominator)) * 1000) / 10;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(1)}%`;
}

export function formatCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("fr-FR").format(Number(value));
}
