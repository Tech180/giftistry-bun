export function isPopulatedExportString(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}
