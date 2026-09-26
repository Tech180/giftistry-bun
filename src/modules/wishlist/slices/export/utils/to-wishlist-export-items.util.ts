import type { ExportAudienceUser } from '../interfaces/export-audience-user.interface';
import type { WishlistExportItem } from '../interfaces/wishlist-export-item.interface';
import type { WishlistExportLink } from '../interfaces/wishlist-export-link.interface';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asNumber(value: unknown): number | null | undefined {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function mapLink(value: unknown): WishlistExportLink | null {
  const row = asRecord(value);
  if (!row) return null;
  return {
    Url: asNullableString(row.Url),
    RetailerName: asNullableString(row.RetailerName),
    ExtractedPrice: asNumber(row.ExtractedPrice),
  };
}

function mapAudienceUser(value: unknown): ExportAudienceUser | null {
  const row = asRecord(value);
  if (!row) return null;
  return {
    UserId: asString(row.UserId),
    FirstName: asNullableString(row.FirstName),
    LastName: asNullableString(row.LastName),
    Username: asNullableString(row.Username),
    Email: asNullableString(row.Email),
  };
}

function mapMetadata(value: unknown): WishlistExportItem['Metadata'] {
  const row = asRecord(value);
  if (!row) return null;
  return {
    IsFavorite: asBoolean(row.IsFavorite),
    IsPinned: asBoolean(row.IsPinned),
    LinkedItemIds: asStringArray(row.LinkedItemIds),
    RelatedItemIds: asStringArray(row.RelatedItemIds),
  };
}

/** Narrow list-items DTO bags into the export item shape. */
export function toWishlistExportItems(items: Record<string, unknown>[]): WishlistExportItem[] {
  return items.flatMap((item) => {
    const id = asString(item.Id);
    const name = asString(item.Name);
    if (!id || name === undefined) return [];

    const links = Array.isArray(item.Links)
      ? item.Links.map(mapLink).filter((link): link is WishlistExportLink => link !== null)
      : undefined;
    const sharedWith = Array.isArray(item.SharedWith)
      ? item.SharedWith.map(mapAudienceUser).filter(
          (user): user is ExportAudienceUser => user !== null
        )
      : undefined;

    return [
      {
        Id: id,
        Name: name,
        Description: asNullableString(item.Description),
        Category: asNullableString(item.Category),
        Priority: asNumber(item.Priority),
        IsFavorite: asBoolean(item.IsFavorite),
        IsPinned: asBoolean(item.IsPinned),
        IsSuggestion: asBoolean(item.IsSuggestion),
        IsHiddenIdea: asBoolean(item.IsHiddenIdea),
        SuggestedByUserId: asNullableString(item.SuggestedByUserId),
        SuggestedByUsername: asNullableString(item.SuggestedByUsername),
        SharedWith: sharedWith,
        Links: links,
        Metadata: mapMetadata(item.Metadata),
      },
    ];
  });
}
