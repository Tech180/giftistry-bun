import type { Item, ItemLink, Claim } from '../item.entity';

export interface ItemRepository {
  findById(id: string): Promise<Item | null>;
  findByListId(listId: string): Promise<Item[]>;
  create(
    listId: string,
    priorityId: string | null,
    suggestedByUserId: string | null,
    name: string,
    description: string | null,
    isHiddenIdea: boolean
  ): Promise<Item>;
  
  createLink(
    itemId: string,
    url: string,
    retailerName: string | null,
    extractedPrice: number | null,
    extractedImageUrl: string | null
  ): Promise<ItemLink>;
  updateLinkMetadata(
    linkId: string,
    extractedPrice: number | null,
    extractedImageUrl: string | null
  ): Promise<void>;
  findLinksByItemId(itemId: string): Promise<ItemLink[]>;
  
  createClaim(
    itemId: string,
    userId: string | null,
    amount: number | null,
    claimedByName: string | null
  ): Promise<Claim>;
  findClaimsByItemId(itemId: string): Promise<Claim[]>;
  findClaimsByListId(listId: string): Promise<Claim[]>;
}
