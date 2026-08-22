import { getDefaultAiPrompt } from '../prompts';
import type { MetadataPack } from './metadata-pack.interface';

function formatFieldLine(pack: MetadataPack): string[] {
  return pack.fields.map((field) => {
    const bucketLabel = field.bucket === 'predefined' ? 'PredefinedFields' : 'UserDefinedFields';
    const hint = field.hint ? `: ${field.hint}` : '';
    return `- ${bucketLabel}.${field.key}${hint}`;
  });
}

function buildPackSection(packs: readonly MetadataPack[]): string {
  const names = packs.map((pack) => pack.label).join(' / ');
  const fieldLines = packs.flatMap(formatFieldLine);
  const fragments = packs
    .map((pack) => pack.promptFragment.trim())
    .filter((fragment) => fragment.length > 0);

  const fieldBlock =
    fieldLines.length > 0
      ? `Extract these fields when present on the page (omit when unknown):\n${fieldLines.join('\n')}`
      : 'Extract pack fields when present on the page (omit when unknown).';

  const fragmentBlock = fragments.length > 0 ? `\n\n${fragments.join('\n\n')}` : '';

  return `=== Metadata Packs ===
Active packs: ${names}
${fieldBlock}${fragmentBlock}`;
}

/**
 * Append selected pack fragments to the populate body.
 * Empty packs leave the body unchanged. An empty body with packs uses the default populate prompt.
 */
export function composePopulateWithPacks(
  populateBody: string,
  packs: readonly MetadataPack[]
): string {
  if (packs.length === 0) return populateBody;
  const base = populateBody.trim() || getDefaultAiPrompt('populate');
  return `${base}\n\n${buildPackSection(packs)}`;
}
