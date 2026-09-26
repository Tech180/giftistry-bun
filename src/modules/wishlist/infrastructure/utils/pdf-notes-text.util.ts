import { normalizePdfNotesText } from './normalize-pdf-notes-text.util';

export function getNotesText(description: string | null | undefined): string {
  if (!description) {
    return '';
  }

  const trimmed = description.trim();
  if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    return normalizePdfNotesText(trimmed);
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      const text = parsed.Text ?? '';
      if (text && typeof text === 'string' && text.trim()) {
        return normalizePdfNotesText(text);
      }
      return '';
    }
  } catch {
    // Fallback
  }

  return normalizePdfNotesText(trimmed);
}
