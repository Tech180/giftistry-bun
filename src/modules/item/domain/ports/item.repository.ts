import type { Item, ItemLink, Claim, ItemPhoto } from '../item.entity';
import type { ItemDescriptionMetadata } from '../item-description.util';
import type {
  ItemSubstitutionKind,
  ItemSubstitutionRow,
} from '../item-substitution.entity';

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
  AllowSubstitutions?: boolean;
  CustomFields?: ItemDescriptionMetadata['CustomFields'] | null;
  Variations?: ItemDescriptionMetadata['Variations'] | null;
  /**
   * Ordered photos. On create: default []. On update: `undefined` leaves existing
   * photos unchanged; `[]` or values replaces the full set.
   */
  Photos?: ItemPhoto[] | null;
}

export interface CreateSubstitutionItemInput {
  listId: string;
  parentItemId: string;
  name: string;
  description: string | null;
  createdByUserId: string;
  kind: ItemSubstitutionKind;
  sortOrder: number;
  category?: string;
  priorityId?: string | null;
  priority?: number | null;
  isHiddenIdea?: boolean;
  metadata?: ItemMetadataWrite | null;
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
  /** Returns the item id that owns this link, or null. */
  findItemIdByLinkId(linkId: string): Promise<string | null>;
  /**
   * Replace item photos only (system / scrape promotion). Does not touch other columns.
   */
  replacePhotos(itemId: string, photos: ItemPhoto[]): Promise<void>;

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
    metadata?: ItemMetadataWrite | null,
    /** When undefined, leave `is_hidden_idea` unchanged. */
    isHiddenIdea?: boolean
  ): Promise<Item>;
  delete(id: string): Promise<void>;
  deleteClaim(itemId: string, userId: string): Promise<void>;
  /** Deletes the user's claims on the given items in one transaction; returns item IDs that had a claim removed. */
  deleteClaimsAtomic(itemIds: string[], userId: string): Promise<string[]>;

  findLinkedItemIds(itemId: string): Promise<string[]>;
  findLinkedItemIdsByListId(listId: string): Promise<Map<string, string[]>>;
  replaceLinkedItemIds(itemId: string, linkedItemIds: string[]): Promise<void>;

  findRelatedItemIds(itemId: string): Promise<string[]>;
  findRelatedItemIdsByListId(listId: string): Promise<Map<string, string[]>>;
  replaceRelatedItemIds(itemId: string, relatedItemIds: string[]): Promise<void>;

  createSubstitution(input: CreateSubstitutionItemInput): Promise<ItemSubstitutionRow>;
  findSubstitutionsByParentId(parentItemId: string): Promise<ItemSubstitutionRow[]>;
  findSubstitutionsByParentIds(parentItemIds: string[]): Promise<Map<string, ItemSubstitutionRow[]>>;
  findSubstitutionById(id: string): Promise<ItemSubstitutionRow | null>;
  findSubstitutionByChildItemId(itemId: string): Promise<ItemSubstitutionRow | null>;
  countOwnerApprovedSubstitutions(parentItemId: string): Promise<number>;
  hasClaimerCustomSubstitution(parentItemId: string): Promise<boolean>;
  updateSubstitutionSortOrders(parentItemId: string, orderedIds: string[]): Promise<void>;
  deleteSubstitution(id: string): Promise<void>;
  updateAllowSubstitutions(itemId: string, allowSubstitutions: boolean): Promise<void>;
}
