import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ItemAudienceUser } from '../domain/item-audience.entity';
import { AppError } from '@/common/middlewares/error.middleware';
import { canUserViewItem, isItemSuggestion } from '../domain/item-visibility.service';
import { parseItemDescription } from '../domain/item-description.util';

export class ListItemsUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository,
    private audienceRepo: ItemAudienceRepository
  ) {}

  async execute(listId: string, currentUserId: string | null) {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const items = await this.itemRepo.findByListId(listId);
    const audienceMap = await this.audienceRepo.findByListId(listId);

    const isOwner = currentUserId === wishlist.UserId;
    const hasExpired = wishlist.ExpiresAt ? new Date() > wishlist.ExpiresAt : false;

    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        const audienceUsers = audienceMap.get(item.Id) ?? [];
        const audienceUserIds = audienceUsers.map(user => user.UserId);

        if (
          !currentUserId ||
          !canUserViewItem({
            item,
            wishlist,
            currentUserId,
            audienceUserIds,
          })
        ) {
          return null;
        }

        const isSuggestion = isItemSuggestion(item, wishlist.UserId);

        const [links, claims] = await Promise.all([
          this.itemRepo.findLinksByItemId(item.Id),
          this.itemRepo.findClaimsByItemId(item.Id),
        ]);

        const shouldHideClaims = isOwner && !hasExpired;

        const claimsResult = shouldHideClaims
          ? []
          : claims.map(c => {
              if (c.Anonymous && c.UserId !== currentUserId) {
                return {
                  ...c,
                  UserId: null,
                  ClaimedByName: 'Anonymous',
                };
              }
              return c;
            });

        const sharedWith: ItemAudienceUser[] | undefined =
          audienceUsers.length > 0 ? audienceUsers : undefined;

        const { metadata } = parseItemDescription(item.Description);

        return {
          Id: item.Id,
          ListId: item.ListId,
          PriorityId: item.PriorityId,
          SuggestedByUserId: item.SuggestedByUserId,
          SuggestedByUsername: item.SuggestedByUsername || null,
          Name: item.Name,
          Description: item.Description,
          IsHiddenIdea: item.IsHiddenIdea,
          IsSuggestion: isSuggestion,
          Category: item.Category,
          Priority: item.Priority,
          CreatedAt: item.CreatedAt,
          SharedWith: sharedWith,
          Links: links,
          Claims: claimsResult,
          IsClaimed: shouldHideClaims ? false : claims.length > 0,
          Metadata: metadata,
        };
      })
    );

    return itemsWithDetails.filter((item): item is NonNullable<typeof item> => item !== null);
  }
}
