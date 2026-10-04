import type { ListShareRepository } from '@/modules/wishlist';
import type { ItemAudienceRepository } from '../../../domain/ports/item-audience.repository';
import type { ItemRepository } from '../../../domain/ports/item.repository';
import { resolveImportAudienceUserIds } from '../../../domain/utils/resolve-import-audience-user-ids.util';
import { resolveImportRelationIds } from '../../../domain/utils/resolve-import-relation-ids.util';
import type { ApplyImportedItemMetadataRow } from '../interfaces/apply-imported-item-metadata-row.interface';

function displayName(person: {
  FirstName?: string | null;
  LastName?: string | null;
  Username?: string | null;
  Email?: string | null;
}): string {
  const first = person.FirstName?.trim();
  const last = person.LastName?.trim();
  if (first || last) {
    return `${first || ''} ${last || ''}`.trim();
  }
  return person.Username || person.Email || 'User';
}

export class ApplyImportedItemMetadataUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private audienceRepo: ItemAudienceRepository,
    private listShareRepo: ListShareRepository
  ) {}

  async execute(
    listId: string,
    currentUserId: string,
    rows: ApplyImportedItemMetadataRow[]
  ): Promise<{ warnings: string[] }> {
    const warnings: string[] = [];
    if (rows.length === 0) {
      return { warnings };
    }

    const listItems = await this.itemRepo.findByListId(listId);
    const index = listItems.map((item) => ({
      id: item.Id,
      name: item.Name,
      category: item.Category || '',
    }));
    const shares = await this.listShareRepo.findSharesWithUsers(listId);
    const people = shares.map((share) => ({
      userId: share.UserId,
      displayName: displayName(share),
    }));

    for (const row of rows) {
      const self = index.find((item) => item.id === row.itemId);
      if (!self) {
        continue;
      }

      if (row.suggestionLabel?.trim()) {
        warnings.push(
          `Suggestion "${row.suggestionLabel.trim()}" on "${self.name}" was kept as a note only.`
        );
      }

      const linked = resolveImportRelationIds({
        peerNames: row.linkedPeerNames ?? [],
        selfId: row.itemId,
        selfCategory: row.category || self.category,
        items: index,
      });
      const related = resolveImportRelationIds({
        peerNames: row.relatedPeerNames ?? [],
        selfId: row.itemId,
        selfCategory: row.category || self.category,
        items: index,
      });
      warnings.push(...linked.warnings, ...related.warnings);

      if ((row.linkedPeerNames?.length ?? 0) > 0) {
        await this.itemRepo.replaceLinkedItemIds(row.itemId, linked.ids);
      }
      if ((row.relatedPeerNames?.length ?? 0) > 0) {
        await this.itemRepo.replaceRelatedItemIds(row.itemId, related.ids);
      }

      if (row.audienceLabel?.trim()) {
        const audience = resolveImportAudienceUserIds({
          audienceLabel: row.audienceLabel,
          currentUserId,
          people,
        });
        warnings.push(...audience.warnings);
        if (audience.userIds.length > 0 || row.audienceLabel.trim().toLowerCase() === 'everyone') {
          await this.audienceRepo.setAudience(row.itemId, audience.userIds);
        }
      }
    }

    return { warnings };
  }
}
