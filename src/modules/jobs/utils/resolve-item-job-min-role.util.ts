import type { ListMinRole } from './interfaces/list-min-role.type';
import type { ItemEnrichIntent } from './interfaces/item-enrich-intent.type';

/**
 * Min list role for item-enrich by intent.
 * All intents are viewer-accessible; create-from-url creates suggestions for non-owners.
 */
export function resolveItemEnrichMinRole(_intent: ItemEnrichIntent): ListMinRole {
  return 'viewer';
}

/** Min list role for item-summarize (write-back mutates the item). */
export function resolveItemSummarizeMinRole(writeBack: boolean | undefined): ListMinRole {
  return writeBack === true ? 'collaborator' : 'viewer';
}
