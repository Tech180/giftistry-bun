import type { ListItemGroupDto } from '../interfaces/list-item-group-dto.interface';

export function groupItemsByCategory(items: Record<string, unknown>[]): ListItemGroupDto[] {
  const groups: ListItemGroupDto[] = [];
  const indexByKey = new Map<string, number>();

  for (const item of items) {
    const key = String(item.CategoryKey || 'uncategorized');
    const label = String(item.CategoryLabel || 'General Items');
    const existingIndex = indexByKey.get(key);
    let group = existingIndex !== undefined ? groups[existingIndex] : undefined;
    if (!group) {
      group = { CategoryKey: key, CategoryLabel: label, Items: [] };
      indexByKey.set(key, groups.length);
      groups.push(group);
    }
    group.Items.push(item);
  }

  return groups;
}
