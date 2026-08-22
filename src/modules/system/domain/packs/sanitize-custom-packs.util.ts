import { CUSTOM_PACK_ID_PATTERN, PACK_FIELD_KEY_PATTERN } from './custom-pack-id.constant';
import type { MetadataPack, MetadataPackField, MetadataPackMatch } from './metadata-pack.interface';
import { listCatalogPackIds, METADATA_PACKS_CATALOG } from './metadata-packs.catalog';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, pascal: string, camel: string): string {
  const raw = record[pascal] ?? record[camel];
  return typeof raw === 'string' ? raw.trim() : '';
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function parseMatch(record: Record<string, unknown>): MetadataPackMatch {
  const raw = asRecord(record.Match) ?? asRecord(record.match) ?? {};
  const categories = readStringList(raw.Categories ?? raw.categories);
  const titleKeywords = readStringList(raw.TitleKeywords ?? raw.titleKeywords);
  const match: MetadataPackMatch = { categories };
  if (titleKeywords.length > 0) match.titleKeywords = titleKeywords;
  return match;
}

function parseField(value: unknown, seenKeys: Set<string>): MetadataPackField | null {
  const record = asRecord(value);
  if (!record) return null;
  const key = readString(record, 'Key', 'key');
  const label = readString(record, 'Label', 'label');
  const bucketRaw = readString(record, 'Bucket', 'bucket');
  const hint = readString(record, 'Hint', 'hint');
  if (!PACK_FIELD_KEY_PATTERN.test(key) || seenKeys.has(key) || !label) return null;
  if (bucketRaw !== 'predefined' && bucketRaw !== 'userDefined') return null;
  seenKeys.add(key);
  const field: MetadataPackField = { key, label, bucket: bucketRaw };
  if (hint) field.hint = hint;
  return field;
}

function parsePack(value: unknown, builtInIds: ReadonlySet<string>): MetadataPack | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, 'Id', 'id');
  const label = readString(record, 'Label', 'label');
  if (!CUSTOM_PACK_ID_PATTERN.test(id) || builtInIds.has(id) || !label) return null;

  const seenKeys = new Set<string>();
  const fieldsRaw = record.Fields ?? record.fields;
  const fields: MetadataPackField[] = [];
  if (Array.isArray(fieldsRaw)) {
    for (const item of fieldsRaw) {
      const field = parseField(item, seenKeys);
      if (field) fields.push(field);
    }
  }

  return {
    id,
    label,
    description: readString(record, 'Description', 'description'),
    match: parseMatch(record),
    fields,
    promptFragment: typeof (record.PromptFragment ?? record.promptFragment) === 'string'
      ? String(record.PromptFragment ?? record.promptFragment)
      : '',
  };
}

export function sanitizeCustomPacks(
  value: unknown,
  builtIn = METADATA_PACKS_CATALOG
): MetadataPack[] {
  if (!Array.isArray(value)) return [];
  const builtInIds = new Set(listCatalogPackIds(builtIn));
  const seen = new Set<string>();
  const result: MetadataPack[] = [];
  for (const item of value) {
    const pack = parsePack(item, builtInIds);
    if (!pack || seen.has(pack.id)) continue;
    seen.add(pack.id);
    result.push(pack);
  }
  return result;
}
