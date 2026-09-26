export function mapOptionalNumber(
  value: number | null | undefined
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return Number(value);
}
