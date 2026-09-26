import { parseJsonValue } from '@/common/utils/parse-json-field.util';
import type { Item } from '../../domain/interfaces/item.interface';
import type { ItemCustomFieldsColumns } from '../../domain/interfaces/item-custom-fields-columns.interface';
import type { ItemPhoto } from '../../domain/interfaces/item-photo.interface';
import type { ItemVariationColumn } from '../../domain/interfaces/item-variation-column.interface';
import type { ItemRow } from '../interfaces/item-row.interface';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mapCustomFields(raw: unknown): ItemCustomFieldsColumns | null {
  const parsed = parseJsonValue(raw);
  if (!isPlainObject(parsed)) {
    return null;
  }

  const predefined = parsed.Predefined;
  const userDefined = parsed.UserDefined;
  return {
    Predefined: isPlainObject(predefined)
      ? (predefined as Record<string, string | null>)
      : {},
    UserDefined: isPlainObject(userDefined)
      ? (userDefined as Record<string, string>)
      : {},
  };
}

function mapVariations(raw: unknown): ItemVariationColumn[] | null {
  const parsed = parseJsonValue(raw);
  return Array.isArray(parsed) ? (parsed as ItemVariationColumn[]) : null;
}

function mapPhotos(raw: unknown): ItemPhoto[] {
  const parsed = parseJsonValue(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const row = entry as Record<string, unknown>;
      const id = typeof row.Id === 'string' ? row.Id : null;
      const url = typeof row.Url === 'string' ? row.Url : null;
      if (!id || !url) {
        return null;
      }

      const sortOrder =
        typeof row.SortOrder === 'number' && Number.isFinite(row.SortOrder)
          ? row.SortOrder
          : index;
      return { Id: id, Url: url, SortOrder: sortOrder };
    })
    .filter((p): p is ItemPhoto => p !== null)
    .sort((a, b) => a.SortOrder - b.SortOrder);
}

export function mapItemRow(row: ItemRow): Item {
  return {
    Id: row.Id,
    ListId: row.ListId,
    PriorityId: row.PriorityId,
    SuggestedByUserId: row.SuggestedByUserId,
    SuggestedByUsername: row.SuggestedByUsername,
    SuggestedByFirstName: row.SuggestedByFirstName ?? null,
    SuggestedByLastName: row.SuggestedByLastName ?? null,
    Name: row.Name,
    Description: row.Description,
    IsHiddenIdea: row.IsHiddenIdea,
    IsSuggestion: row.IsSuggestion,
    Category: row.Category,
    Priority: row.Priority != null ? Number(row.Priority) : null,
    CreatedAt: row.CreatedAt ? new Date(row.CreatedAt) : undefined,
    IsFavorite: row.IsFavorite === true,
    IsPinned: row.IsPinned === true,
    DesiredQuantity: row.DesiredQuantity != null ? Number(row.DesiredQuantity) : null,
    MultiCount: row.MultiCount === true,
    OtherUsersCanSee:
      row.OtherUsersCanSee === null || row.OtherUsersCanSee === undefined
        ? null
        : row.OtherUsersCanSee === true,
    CustomFields: mapCustomFields(row.CustomFields),
    Variations: mapVariations(row.Variations),
    Photos: mapPhotos(row.Photos),
    AllowSubstitutions: row.AllowSubstitutions !== false,
    IsSubstitution: row.IsSubstitution === true,
    SubstitutionForItemId: row.SubstitutionForItemId ?? null,
  };
}
