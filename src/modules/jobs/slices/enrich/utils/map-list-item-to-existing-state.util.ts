import type { ItemDescriptionMetadata } from '@/modules/item';
import { DEFAULT_EXISTING_ITEM_STATE } from '../constants/default-existing-item-state.constant';
import type { ExistingItemState } from '../interfaces/existing-item-state.interface';

export function mapListItemToExistingState(
  found: {
    Name?: unknown;
    Description?: unknown;
    Category?: unknown;
    Priority?: unknown;
    Metadata?: unknown;
  } | undefined,
  fallback: ExistingItemState = DEFAULT_EXISTING_ITEM_STATE
): ExistingItemState {
  if (!found) {
    return fallback;
  }

  const metadata =
    found.Metadata && typeof found.Metadata === 'object'
      ? (found.Metadata as ItemDescriptionMetadata)
      : null;

  return {
    name: String(found.Name ?? fallback.name),
    description: (found.Description as string | null) ?? null,
    category: String(found.Category ?? fallback.category),
    priority: (found.Priority as number | null) ?? null,
    metadata,
  };
}
