import type { Item, ItemLink, Claim } from '../item.entity';
import type { ItemDescriptionMetadata } from '../item-description.util';

export interface CreateClaimInput {
  itemId: string;
  userId: string;
  amount: number | null;
  claimedByName: string | null;
  anonymous: boolean;
  quantity: number;
  selection: string | null;
}

export interface ItemMetadataWrite {
  IsFavorite?: boolean;
  IsPinned?: boolean;
  DesiredQuantity?: number | null;
  MultiCount?: boolean;
  OtherUsersCanSee?: boolean | null;
  CustomFields?: ItemDescriptionMetadata['CustomFields'] | null;
  Variations?: ItemDescriptionMetadata['Variations'] | null;
}

export interface ItemRepository {
  findById(id: string): Promise<Item | null>;
  findByListId(listId: string): Promise<Item[]>;
  create(
    listId: string,
    priorityId: string | null,
    suggestedByUserId: string | null,
    name: string,
    description: string | null,
    isHiddenIdea: boolean,
    category: string,
    isSuggestion?: boolean,
    priority?: number | null,
    metadata?: ItemMetadataWrite | null
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
  updateLink(
    linkId: string,
    url: string,
    retailerName: string | null,
    extractedPrice: number | null,
    extractedImageUrl: string | null
  ): Promise<ItemLink>;
  deleteLinksByItemId(itemId: string): Promise<void>;
  findLinksByItemId(itemId: string): Promise<ItemLink[]>;

  createClaim(
    itemId: string,
    userId: string | null,
    amount: number | null,
    claimedByName: string | null,
    anonymous?: boolean,
    quantity?: number,
    selection?: string | null
  ): Promise<Claim>;
  createClaimsAtomic(claims: CreateClaimInput[]): Promise<Claim[]>;
  findClaimsByItemId(itemId: string): Promise<Claim[]>;
  findClaimsByListId(listId: string): Promise<Claim[]>;
  update(
    id: string,
    name: string,
    description: string | null,
    priorityId: string | null,
    category: string,
    priority?: number | null,
    metadata?: ItemMetadataWrite | null
  ): Promise<Item>;
  delete(id: string): Promise<void>;
  deleteClaim(itemId: string, userId: string): Promise<void>;

  findLinkedItemIds(itemId: string): Promise<string[]>;
  findLinkedItemIdsByListId(listId: string): Promise<Map<string, string[]>>;
  replaceLinkedItemIds(itemId: string, linkedItemIds: string[]): Promise<void>;
}
