export interface DescriptionFieldContext {
  predefinedFields?: Record<string, string>;
  userDefinedFields?: Record<string, string>;
  color?: string | null;
  size?: string | null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectSpecValues(ctx: DescriptionFieldContext): string[] {
  const values = new Set<string>();

  const add = (val: string | null | undefined) => {
    const trimmed = val?.trim();
    if (trimmed) values.add(trimmed);
  };

  add(ctx.color);
  add(ctx.size);

  for (const map of [ctx.predefinedFields, ctx.userDefinedFields]) {
    for (const val of Object.values(map ?? {})) {
      add(val);
    }
  }

  return [...values];
}

function stripKnownSpecMentions(text: string, specs: string[]): string {
  let result = text
    .replace(/\b\d+\s*(?:GB|TB|MB|G|T)\b(?:\s*(?:RAM|SSD|storage|memory))?/gi, '')
    .replace(/\b(?:RAM|SSD|storage|memory)\s*(?:of\s*)?\d+\s*(?:GB|TB|MB)\b/gi, '');

  for (const spec of specs) {
    const pattern = new RegExp(`\\b${escapeRegex(spec)}\\b`, 'gi');
    result = result.replace(pattern, '');
  }

  return result
    .replace(/\bwith\s+/gi, ' ')
    .replace(/\band\s+for\b/gi, 'for')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/^[,\s.;:-]+|[,\s.;:-]+$/g, '')
    .trim();
}

function isUsableDescription(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length >= 3 && text.length >= 12;
}

export function sanitizeProductDescription(
  description: string | null | undefined,
  ctx: DescriptionFieldContext
): string | null {
  const trimmed = description?.trim();
  if (!trimmed) return null;

  const specs = collectSpecValues(ctx);
  const hasSpecs =
    specs.length > 0 ||
    /\b\d+\s*(?:GB|TB|MB)\b/i.test(trimmed) ||
    /\b(?:RAM|SSD|storage|memory)\b/i.test(trimmed);

  if (!hasSpecs) {
    return trimmed;
  }

  const cleaned = stripKnownSpecMentions(trimmed, specs);
  if (isUsableDescription(cleaned)) {
    return cleaned;
  }

  return null;
}
