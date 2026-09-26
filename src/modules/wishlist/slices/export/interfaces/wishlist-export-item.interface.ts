import type { ExportAudienceUser } from './export-audience-user.interface';
import type { WishlistExportLink } from './wishlist-export-link.interface';

export interface WishlistExportItem {
  Id: string;
  Name: string;
  Description?: string | null;
  Category?: string | null;
  Priority?: number | null;
  IsFavorite?: boolean;
  IsPinned?: boolean;
  IsSuggestion?: boolean;
  IsHiddenIdea?: boolean;
  SuggestedByUserId?: string | null;
  SuggestedByUsername?: string | null;
  SharedWith?: ExportAudienceUser[];
  Links?: WishlistExportLink[];
  Metadata?: {
    IsFavorite?: boolean;
    IsPinned?: boolean;
    LinkedItemIds?: string[];
    RelatedItemIds?: string[];
  } | null;
  categoryFormatted?: string;
  isFav?: boolean;
}
