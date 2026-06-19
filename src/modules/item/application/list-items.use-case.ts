import type { ItemRepository } from '../domain/ports/item.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import { AppError } from '@/common/middlewares/error.middleware';

export class ListItemsUseCase {
  constructor(
    private itemRepo: ItemRepository,
    private wishlistRepo: WishlistRepository
  ) {}

  async execute(listId: string, currentUserId: string | null) {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const items = await this.itemRepo.findByListId(listId);
    
    const isOwner = currentUserId === wishlist.UserId;
    const hasExpired = wishlist.ExpiresAt ? new Date() > wishlist.ExpiresAt : false;

    // Map items and attach links and claims based on permissions
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        // Rule 1: Hide collaborator suggestions and hidden ideas from the owner
        const isSuggestion = item.IsSuggestion || (item.SuggestedByUserId !== null && item.SuggestedByUserId !== wishlist.UserId);
        let otherUsersCanSee = true;
        if (item.Description) {
          try {
            if (item.Description.startsWith('{') && item.Description.endsWith('}')) {
              const parsed = JSON.parse(item.Description);
              if (parsed && typeof parsed === 'object' && parsed.otherUsersCanSee === false) {
                otherUsersCanSee = false;
              }
            }
          } catch (_) {
            // Plain text description
          }
        }

        const shouldHideSuggestion = isOwner && (
          !hasExpired || !wishlist.RevealSuggestions
        );

        if (isOwner && (item.IsHiddenIdea || isSuggestion) && shouldHideSuggestion) {
          return null; // Will filter out
        }

        if (!isOwner && isSuggestion && !otherUsersCanSee && item.SuggestedByUserId !== currentUserId) {
          return null; // Hide private recommendation from other users
        }

        const [links, claims] = await Promise.all([
          this.itemRepo.findLinksByItemId(item.Id),
          this.itemRepo.findClaimsByItemId(item.Id),
        ]);

        // Rule 2: Hide claim details from owner unless the list has expired
        const shouldHideClaims = isOwner && !hasExpired;
        
        const claimsResult = shouldHideClaims 
          ? [] 
          : claims.map(c => {
              if (c.Anonymous && c.UserId !== currentUserId) {
                return {
                  ...c,
                  UserId: null,
                  ClaimedByName: 'Anonymous'
                };
              }
              return c;
            });

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
          CreatedAt: item.CreatedAt,
          Links: links,
          Claims: claimsResult,
          IsClaimed: shouldHideClaims ? false : claims.length > 0,
        };
      })
    );

    return itemsWithDetails.filter((item): item is NonNullable<typeof item> => item !== null);
  }
}
