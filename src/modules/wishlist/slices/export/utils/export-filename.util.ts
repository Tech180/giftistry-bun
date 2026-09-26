export function toPascalCase(str: string): string {
  if (!str) {
    return '';
  }
  return str
    .replace(/[^a-zA-Z0-9\s-_]+/g, '')
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export function getFormattedDate(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${mm}${dd}${yyyy}`;
}

export function getExportFilename(title: string, exporterName: string | undefined, ext: string): string {
  const pascalTitle = toPascalCase(title) || 'Wishlist';
  const dateStr = getFormattedDate();
  const exporterClean = toPascalCase(exporterName || 'Export');
  return `${pascalTitle}_${dateStr}_${exporterClean}.${ext}`;
}
