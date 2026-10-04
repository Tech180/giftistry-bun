import type { ImportNameIndexEntry } from '../interfaces/import-name-index-entry.interface';
import type { ResolveImportRelationIdsResult } from '../interfaces/resolve-import-relation-ids-result.interface';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveImportRelationIds(params: {
  peerNames: string[];
  selfId: string;
  selfCategory: string;
  items: ImportNameIndexEntry[];
}): ResolveImportRelationIdsResult {
  const ids: string[] = [];
  const warnings: string[] = [];
  const selfCategory = normalize(params.selfCategory);

  for (const rawName of params.peerNames) {
    const name = normalize(rawName);
    if (!name) {
      continue;
    }
    const matches = params.items.filter(
      (item) => item.id !== params.selfId && normalize(item.name) === name
    );
    const sameCategory = matches.filter((item) => normalize(item.category) === selfCategory);
    const chosen = sameCategory.length > 0 ? sameCategory : matches;
    if (chosen.length === 1 && chosen[0]) {
      ids.push(chosen[0].id);
      continue;
    }
    if (chosen.length === 0) {
      warnings.push(`Could not find linked item "${rawName.trim()}".`);
      continue;
    }
    warnings.push(`Item name "${rawName.trim()}" matches more than one item; skipped.`);
  }

  return { ids: [...new Set(ids)], warnings };
}
