import type { ItemRepository, ItemMetadataWrite, CreateSubstitutionItemInput } from '../domain/ports/item.repository';
import type { Item, ItemCustomFieldsColumns, ItemLink, Claim, ItemPhoto, ItemVariationColumn } from '../domain/item.entity';
import type { ItemSubstitutionRow } from '../domain/item-substitution.entity';
import { sql } from '@/common/database/connection';

const ITEM_SELECT = `
  i.id as "Id", i.list_id as "ListId", i.priority_id as "PriorityId",
  i.suggested_by_user_id as "SuggestedByUserId", u.username as "SuggestedByUsername",
  u.first_name as "SuggestedByFirstName", u.last_name as "SuggestedByLastName",
  i.name as "Name", i.description as "Description",
  i.is_hidden_idea as "IsHiddenIdea", i.is_suggestion as "IsSuggestion",
  i.category as "Category", i.priority as "Priority", i.created_at as "CreatedAt",
  i.is_favorite as "IsFavorite", i.is_pinned as "IsPinned",
  i.desired_quantity as "DesiredQuantity", i.multi_count as "MultiCount",
  i.other_users_can_see as "OtherUsersCanSee",
  i.custom_fields as "CustomFields", i.variations as "Variations",
  i.photos as "Photos",
  i.allow_substitutions as "AllowSubstitutions",
  i.is_substitution as "IsSubstitution",
  i.substitution_for_item_id as "SubstitutionForItemId"
`;

function parseJsonValue(raw: unknown): unknown {
  let value: unknown = raw;
  // Heal double-encoded jsonb (plain string stored in a jsonb column).
  for (let i = 0; i < 2 && typeof value === 'string'; i++) {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mapCustomFields(raw: unknown): ItemCustomFieldsColumns | null {
  const parsed = parseJsonValue(raw);
  if (!isPlainObject(parsed)) return null;
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
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const id = typeof row.Id === 'string' ? row.Id : null;
      const url = typeof row.Url === 'string' ? row.Url : null;
      if (!id || !url) return null;
      const sortOrder =
        typeof row.SortOrder === 'number' && Number.isFinite(row.SortOrder)
          ? row.SortOrder
          : index;
      return { Id: id, Url: url, SortOrder: sortOrder };
    })
    .filter((p): p is ItemPhoto => p !== null)
    .sort((a, b) => a.SortOrder - b.SortOrder);
}

function mapItemRow(row: any): Item {
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

function metadataDefaults(metadata?: ItemMetadataWrite | null) {
  return {
    isFavorite: metadata?.IsFavorite === true,
    isPinned: metadata?.IsPinned === true,
    desiredQuantity:
      metadata?.DesiredQuantity !== undefined ? metadata.DesiredQuantity : null,
    multiCount: metadata?.MultiCount === true,
    otherUsersCanSee:
      metadata?.OtherUsersCanSee !== undefined ? metadata.OtherUsersCanSee : null,
    allowSubstitutions: metadata?.AllowSubstitutions !== false,
    customFields: metadata?.CustomFields ?? {},
    variations: metadata?.Variations ?? [],
    photos: (metadata?.Photos ?? []) as ItemPhoto[],
  };
}

function mapSubstitutionRow(row: any): ItemSubstitutionRow {
  return {
    Id: row.Id,
    ParentItemId: row.ParentItemId,
    SubstitutionItemId: row.SubstitutionItemId,
    Kind: row.Kind,
    CreatedByUserId: row.CreatedByUserId,
    SortOrder: Number(row.SortOrder) || 0,
    CreatedAt: row.CreatedAt ? new Date(row.CreatedAt) : undefined,
  };
}

export class PostgresItemRepository implements ItemRepository {
  async findById(id: string): Promise<Item | null> {
    const [row] = await sql`
      SELECT ${sql.unsafe(ITEM_SELECT)}
      FROM items i
      LEFT JOIN users u ON i.suggested_by_user_id = u.id
      WHERE i.id = ${id}
    `;
    if (!row) return null;
    const item = mapItemRow(row);
    item.LinkedItemIds = await this.findLinkedItemIds(id);
    item.RelatedItemIds = await this.findRelatedItemIds(id);
    return item;
  }

  async findByListId(listId: string): Promise<Item[]> {
    const rows = await sql`
      SELECT ${sql.unsafe(ITEM_SELECT)}
      FROM items i
      LEFT JOIN users u ON i.suggested_by_user_id = u.id
      WHERE i.list_id = ${listId}
        AND COALESCE(i.is_substitution, FALSE) = FALSE
      ORDER BY i.created_at DESC
    `;
    const linkedMap = await this.findLinkedItemIdsByListId(listId);
    const relatedMap = await this.findRelatedItemIdsByListId(listId);
    return rows.map((row: any) => {
      const item = mapItemRow(row);
      item.LinkedItemIds = linkedMap.get(item.Id) ?? [];
      item.RelatedItemIds = relatedMap.get(item.Id) ?? [];
      return item;
    });
  }

  async create(
    listId: string,
    priorityId: string | null,
    suggestedByUserId: string | null,
    name: string,
    description: string | null,
    isHiddenIdea: boolean,
    category: string = 'uncategorized',
    isSuggestion: boolean = false,
    priority: number | null = null,
    metadata: ItemMetadataWrite | null = null
  ): Promise<Item> {
    const meta = metadataDefaults(metadata);
    const [row] = await sql`
      INSERT INTO items (
        list_id, priority_id, suggested_by_user_id, name, description,
        is_hidden_idea, category, is_suggestion, priority,
        is_favorite, is_pinned, desired_quantity, multi_count,
        other_users_can_see, allow_substitutions, custom_fields, variations, photos
      )
      VALUES (
        ${listId}, ${priorityId}, ${suggestedByUserId}, ${name}, ${description},
        ${isHiddenIdea}, ${category}, ${isSuggestion}, ${priority},
        ${meta.isFavorite}, ${meta.isPinned}, ${meta.desiredQuantity}, ${meta.multiCount},
        ${meta.otherUsersCanSee}, ${meta.allowSubstitutions},
        ${sql.json(meta.customFields as never)},
        ${sql.json(meta.variations as never)},
        ${sql.json(meta.photos as never)}
      )
      RETURNING id as "Id", list_id as "ListId", priority_id as "PriorityId",
                suggested_by_user_id as "SuggestedByUserId", name as "Name",
                description as "Description", is_hidden_idea as "IsHiddenIdea",
                is_suggestion as "IsSuggestion", category as "Category",
                priority as "Priority", created_at as "CreatedAt",
                is_favorite as "IsFavorite", is_pinned as "IsPinned",
                desired_quantity as "DesiredQuantity", multi_count as "MultiCount",
                other_users_can_see as "OtherUsersCanSee",
                custom_fields as "CustomFields", variations as "Variations",
                photos as "Photos"
    `;
    if (!row) throw new Error('Failed to create item');
    return mapItemRow(row);
  }

  async createLink(
    itemId: string,
    url: string,
    retailerName: string | null,
    extractedPrice: number | null,
    extractedImageUrl: string | null
  ): Promise<ItemLink> {
    const [row] = await sql<any[]>`
      INSERT INTO item_links (item_id, url, retailer_name, extracted_price, extracted_image_url)
      VALUES (${itemId}, ${url}, ${retailerName}, ${extractedPrice}, ${extractedImageUrl})
      RETURNING id as "Id", item_id as "ItemId", url as "Url", retailer_name as "RetailerName",
                extracted_price as "ExtractedPrice", extracted_image_url as "ExtractedImageUrl"
    `;
    if (!row) throw new Error('Failed to create item link');
    return {
      Id: row.Id,
      ItemId: row.ItemId,
      Url: row.Url,
      RetailerName: row.RetailerName,
      ExtractedPrice: row.ExtractedPrice ? Number(row.ExtractedPrice) : null,
      ExtractedImageUrl: row.ExtractedImageUrl,
    };
  }

  async updateLinkMetadata(
    linkId: string,
    extractedPrice: number | null,
    extractedImageUrl: string | null
  ): Promise<void> {
    await sql`
      UPDATE item_links
      SET extracted_price = ${extractedPrice},
          extracted_image_url = ${extractedImageUrl}
      WHERE id = ${linkId}
    `;
  }

  async updateLink(
    linkId: string,
    url: string,
    retailerName: string | null,
    extractedPrice: number | null,
    extractedImageUrl: string | null
  ): Promise<ItemLink> {
    const [row] = await sql<any[]>`
      UPDATE item_links
      SET url = ${url},
          retailer_name = ${retailerName},
          extracted_price = ${extractedPrice},
          extracted_image_url = ${extractedImageUrl}
      WHERE id = ${linkId}
      RETURNING id as "Id", item_id as "ItemId", url as "Url", retailer_name as "RetailerName",
                extracted_price as "ExtractedPrice", extracted_image_url as "ExtractedImageUrl"
    `;
    if (!row) throw new Error('Item link not found or failed to update');
    return {
      Id: row.Id,
      ItemId: row.ItemId,
      Url: row.Url,
      RetailerName: row.RetailerName,
      ExtractedPrice: row.ExtractedPrice ? Number(row.ExtractedPrice) : null,
      ExtractedImageUrl: row.ExtractedImageUrl,
    };
  }

  async deleteLinksByItemId(itemId: string): Promise<void> {
    await sql`DELETE FROM item_links WHERE item_id = ${itemId}`;
  }

  async findLinksByItemId(itemId: string): Promise<ItemLink[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", item_id as "ItemId", url as "Url", retailer_name as "RetailerName",
             extracted_price as "ExtractedPrice", extracted_image_url as "ExtractedImageUrl"
      FROM item_links
      WHERE item_id = ${itemId}
    `;
    return rows.map((row) => ({
      Id: row.Id,
      ItemId: row.ItemId,
      Url: row.Url,
      RetailerName: row.RetailerName,
      ExtractedPrice: row.ExtractedPrice ? Number(row.ExtractedPrice) : null,
      ExtractedImageUrl: row.ExtractedImageUrl,
    }));
  }

  async createClaim(
    itemId: string,
    userId: string | null,
    amount: number | null,
    claimedByName: string | null,
    anonymous: boolean = false,
    quantity: number = 1,
    selection: string | null = null
  ): Promise<Claim> {
    const [row] = await sql<any[]>`
      INSERT INTO claims (item_id, user_id, amount, claimed_by_name, anonymous, quantity, selection)
      VALUES (${itemId}, ${userId}, ${amount}, ${claimedByName}, ${anonymous}, ${quantity}, ${selection})
      RETURNING id as "Id", item_id as "ItemId", user_id as "UserId", amount as "Amount",
                claimed_by_name as "ClaimedByName", anonymous as "Anonymous", claimed_at as "ClaimedAt",
                quantity as "Quantity", selection as "Selection"
    `;
    if (!row) throw new Error('Failed to create claim');
    return {
      Id: row.Id,
      ItemId: row.ItemId,
      UserId: row.UserId,
      Amount: row.Amount ? Number(row.Amount) : null,
      ClaimedByName: row.ClaimedByName,
      Anonymous: row.Anonymous,
      ClaimedAt: new Date(row.ClaimedAt),
      Quantity: row.Quantity ? Number(row.Quantity) : 1,
      Selection: row.Selection,
    };
  }

  async createClaimsAtomic(
    claims: Array<{
      itemId: string;
      userId: string;
      amount: number | null;
      claimedByName: string | null;
      anonymous: boolean;
      quantity: number;
      selection: string | null;
    }>
  ): Promise<Claim[]> {
    if (claims.length === 0) {
      return [];
    }

    return await sql.begin(async (tx) => {
      const created: Claim[] = [];
      for (const claim of claims) {
        const [row] = await tx<any[]>`
          INSERT INTO claims (item_id, user_id, amount, claimed_by_name, anonymous, quantity, selection)
          VALUES (
            ${claim.itemId},
            ${claim.userId},
            ${claim.amount},
            ${claim.claimedByName},
            ${claim.anonymous},
            ${claim.quantity},
            ${claim.selection}
          )
          RETURNING id as "Id", item_id as "ItemId", user_id as "UserId", amount as "Amount",
                    claimed_by_name as "ClaimedByName", anonymous as "Anonymous", claimed_at as "ClaimedAt",
                    quantity as "Quantity", selection as "Selection"
        `;
        if (!row) {
          throw new Error('Failed to create claim');
        }
        created.push({
          Id: row.Id,
          ItemId: row.ItemId,
          UserId: row.UserId,
          Amount: row.Amount ? Number(row.Amount) : null,
          ClaimedByName: row.ClaimedByName,
          Anonymous: row.Anonymous,
          ClaimedAt: new Date(row.ClaimedAt),
          Quantity: row.Quantity ? Number(row.Quantity) : 1,
          Selection: row.Selection,
        });
      }
      return created;
    });
  }

  async findClaimsByItemId(itemId: string): Promise<Claim[]> {
    const rows = await sql<any[]>`
      SELECT id as "Id", item_id as "ItemId", user_id as "UserId", amount as "Amount",
             claimed_by_name as "ClaimedByName", anonymous as "Anonymous", claimed_at as "ClaimedAt",
             quantity as "Quantity", selection as "Selection"
      FROM claims
      WHERE item_id = ${itemId}
    `;
    return rows.map((row) => ({
      Id: row.Id,
      ItemId: row.ItemId,
      UserId: row.UserId,
      Amount: row.Amount ? Number(row.Amount) : null,
      ClaimedByName: row.ClaimedByName,
      Anonymous: row.Anonymous,
      ClaimedAt: new Date(row.ClaimedAt),
      Quantity: row.Quantity ? Number(row.Quantity) : 1,
      Selection: row.Selection,
    }));
  }

  async findClaimsByListId(listId: string): Promise<Claim[]> {
    const rows = await sql<any[]>`
      SELECT c.id as "Id", c.item_id as "ItemId", c.user_id as "UserId", c.amount as "Amount",
             c.claimed_by_name as "ClaimedByName", c.anonymous as "Anonymous", c.claimed_at as "ClaimedAt",
             c.quantity as "Quantity", c.selection as "Selection"
      FROM claims c
      JOIN items i ON c.item_id = i.id
      WHERE i.list_id = ${listId}
    `;
    return rows.map((row) => ({
      Id: row.Id,
      ItemId: row.ItemId,
      UserId: row.UserId,
      Amount: row.Amount ? Number(row.Amount) : null,
      ClaimedByName: row.ClaimedByName,
      Anonymous: row.Anonymous,
      ClaimedAt: new Date(row.ClaimedAt),
      Quantity: row.Quantity ? Number(row.Quantity) : 1,
      Selection: row.Selection,
    }));
  }

  async update(
    id: string,
    name: string,
    description: string | null,
    priorityId: string | null,
    category: string,
    priority: number | null = null,
    metadata: ItemMetadataWrite | null = null,
    isHiddenIdea?: boolean
  ): Promise<Item> {
    // null → COALESCE keeps existing is_hidden_idea; boolean overwrites.
    const hiddenParam = isHiddenIdea !== undefined ? isHiddenIdea : null;

    if (metadata) {
      const meta = metadataDefaults(metadata);
      const updatePhotos = metadata.Photos !== undefined;
      const photosValue = (metadata.Photos ?? []) as ItemPhoto[];

      if (updatePhotos) {
        const [row] = await sql`
          UPDATE items
          SET name = ${name},
              description = ${description},
              priority_id = ${priorityId},
              category = ${category},
              priority = ${priority},
              is_hidden_idea = COALESCE(${hiddenParam}, is_hidden_idea),
              is_favorite = ${meta.isFavorite},
              is_pinned = ${meta.isPinned},
              desired_quantity = ${meta.desiredQuantity},
              multi_count = ${meta.multiCount},
              other_users_can_see = ${meta.otherUsersCanSee},
              allow_substitutions = ${meta.allowSubstitutions},
              custom_fields = ${sql.json(meta.customFields as never)},
              variations = ${sql.json(meta.variations as never)},
              photos = ${sql.json(photosValue as never)}
          WHERE id = ${id}
          RETURNING id as "Id", list_id as "ListId", priority_id as "PriorityId",
                    suggested_by_user_id as "SuggestedByUserId", name as "Name",
                    description as "Description", is_hidden_idea as "IsHiddenIdea",
                    is_suggestion as "IsSuggestion", category as "Category",
                    priority as "Priority", created_at as "CreatedAt",
                    is_favorite as "IsFavorite", is_pinned as "IsPinned",
                    desired_quantity as "DesiredQuantity", multi_count as "MultiCount",
                    other_users_can_see as "OtherUsersCanSee",
                    allow_substitutions as "AllowSubstitutions",
                    is_substitution as "IsSubstitution",
                    substitution_for_item_id as "SubstitutionForItemId",
                    custom_fields as "CustomFields", variations as "Variations",
                    photos as "Photos"
        `;
        if (!row) throw new Error('Item not found or failed to update');
        const item = mapItemRow(row);
        item.LinkedItemIds = await this.findLinkedItemIds(id);
        item.RelatedItemIds = await this.findRelatedItemIds(id);
        return item;
      }

      const [row] = await sql`
        UPDATE items
        SET name = ${name},
            description = ${description},
            priority_id = ${priorityId},
            category = ${category},
            priority = ${priority},
            is_hidden_idea = COALESCE(${hiddenParam}, is_hidden_idea),
            is_favorite = ${meta.isFavorite},
            is_pinned = ${meta.isPinned},
            desired_quantity = ${meta.desiredQuantity},
            multi_count = ${meta.multiCount},
            other_users_can_see = ${meta.otherUsersCanSee},
            allow_substitutions = ${meta.allowSubstitutions},
            custom_fields = ${sql.json(meta.customFields as never)},
            variations = ${sql.json(meta.variations as never)}
        WHERE id = ${id}
        RETURNING id as "Id", list_id as "ListId", priority_id as "PriorityId",
                  suggested_by_user_id as "SuggestedByUserId", name as "Name",
                  description as "Description", is_hidden_idea as "IsHiddenIdea",
                  is_suggestion as "IsSuggestion", category as "Category",
                  priority as "Priority", created_at as "CreatedAt",
                  is_favorite as "IsFavorite", is_pinned as "IsPinned",
                  desired_quantity as "DesiredQuantity", multi_count as "MultiCount",
                  other_users_can_see as "OtherUsersCanSee",
                  custom_fields as "CustomFields", variations as "Variations",
                  photos as "Photos"
      `;
      if (!row) throw new Error('Item not found or failed to update');
      const item = mapItemRow(row);
      item.LinkedItemIds = await this.findLinkedItemIds(id);
      item.RelatedItemIds = await this.findRelatedItemIds(id);
      return item;
    }

    const [row] = await sql`
      UPDATE items
      SET name = ${name},
          description = ${description},
          priority_id = ${priorityId},
          category = ${category},
          priority = ${priority},
          is_hidden_idea = COALESCE(${hiddenParam}, is_hidden_idea)
      WHERE id = ${id}
      RETURNING id as "Id", list_id as "ListId", priority_id as "PriorityId",
                suggested_by_user_id as "SuggestedByUserId", name as "Name",
                description as "Description", is_hidden_idea as "IsHiddenIdea",
                is_suggestion as "IsSuggestion", category as "Category",
                priority as "Priority", created_at as "CreatedAt",
                is_favorite as "IsFavorite", is_pinned as "IsPinned",
                desired_quantity as "DesiredQuantity", multi_count as "MultiCount",
                other_users_can_see as "OtherUsersCanSee",
                custom_fields as "CustomFields", variations as "Variations",
                photos as "Photos"
    `;
    if (!row) throw new Error('Item not found or failed to update');
    const item = mapItemRow(row);
    item.LinkedItemIds = await this.findLinkedItemIds(id);
    item.RelatedItemIds = await this.findRelatedItemIds(id);
    return item;
  }

  async delete(id: string): Promise<void> {
    await sql.begin(async (tx) => {
      await tx`DELETE FROM claims WHERE item_id = ${id}`;
      await tx`DELETE FROM item_links WHERE item_id = ${id}`;
      await tx`DELETE FROM item_item_links WHERE item_id = ${id} OR linked_item_id = ${id}`;
      await tx`DELETE FROM item_item_related WHERE item_id = ${id} OR related_item_id = ${id}`;
      await tx`DELETE FROM items WHERE id = ${id}`;
    });
  }

  async deleteClaim(itemId: string, userId: string): Promise<void> {
    await sql`DELETE FROM claims WHERE item_id = ${itemId} AND user_id = ${userId}`;
  }

  async deleteClaimsAtomic(itemIds: string[], userId: string): Promise<string[]> {
    const unique = [...new Set(itemIds.filter(Boolean))];
    if (unique.length === 0) {
      return [];
    }

    return await sql.begin(async (tx) => {
      const affected: string[] = [];
      for (const itemId of unique) {
        const rows = await tx<{ ItemId: string }[]>`
          DELETE FROM claims
          WHERE item_id = ${itemId} AND user_id = ${userId}
          RETURNING item_id as "ItemId"
        `;
        if (rows.length > 0) {
          affected.push(itemId);
        }
      }
      return affected;
    });
  }

  async findLinkedItemIds(itemId: string): Promise<string[]> {
    const rows = await sql<{ LinkedItemId: string }[]>`
      SELECT linked_item_id as "LinkedItemId"
      FROM item_item_links
      WHERE item_id = ${itemId}
    `;
    return rows.map((row) => row.LinkedItemId);
  }

  async findLinkedItemIdsByListId(listId: string): Promise<Map<string, string[]>> {
    const rows = await sql<{ ItemId: string; LinkedItemId: string }[]>`
      SELECT l.item_id as "ItemId", l.linked_item_id as "LinkedItemId"
      FROM item_item_links l
      JOIN items i ON i.id = l.item_id
      WHERE i.list_id = ${listId}
    `;
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const existing = map.get(row.ItemId) ?? [];
      existing.push(row.LinkedItemId);
      map.set(row.ItemId, existing);
    }
    return map;
  }

  async replaceLinkedItemIds(itemId: string, linkedItemIds: string[]): Promise<void> {
    const unique = [...new Set(linkedItemIds.filter((id) => id && id !== itemId))];
    await sql.begin(async (tx) => {
      await tx`DELETE FROM item_item_links WHERE item_id = ${itemId}`;
      for (const linkedId of unique) {
        await tx`
          INSERT INTO item_item_links (item_id, linked_item_id)
          VALUES (${itemId}, ${linkedId})
          ON CONFLICT DO NOTHING
        `;
      }
    });
  }

  async findRelatedItemIds(itemId: string): Promise<string[]> {
    const rows = await sql<{ RelatedItemId: string }[]>`
      SELECT related_item_id as "RelatedItemId"
      FROM item_item_related
      WHERE item_id = ${itemId}
    `;
    return rows.map((row) => row.RelatedItemId);
  }

  async findRelatedItemIdsByListId(listId: string): Promise<Map<string, string[]>> {
    const rows = await sql<{ ItemId: string; RelatedItemId: string }[]>`
      SELECT r.item_id as "ItemId", r.related_item_id as "RelatedItemId"
      FROM item_item_related r
      JOIN items i ON i.id = r.item_id
      WHERE i.list_id = ${listId}
    `;
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const existing = map.get(row.ItemId) ?? [];
      existing.push(row.RelatedItemId);
      map.set(row.ItemId, existing);
    }
    return map;
  }

  async replaceRelatedItemIds(itemId: string, relatedItemIds: string[]): Promise<void> {
    const unique = [...new Set(relatedItemIds.filter((id) => id && id !== itemId))];
    await sql.begin(async (tx) => {
      await tx`DELETE FROM item_item_related WHERE item_id = ${itemId}`;
      for (const relatedId of unique) {
        await tx`
          INSERT INTO item_item_related (item_id, related_item_id)
          VALUES (${itemId}, ${relatedId})
          ON CONFLICT DO NOTHING
        `;
      }
    });
  }

  async createSubstitution(input: CreateSubstitutionItemInput): Promise<ItemSubstitutionRow> {
    return sql.begin(async (tx) => {
      const meta = metadataDefaults(input.metadata ?? null);
      const [child] = await tx`
        INSERT INTO items (
          list_id, name, description, category, priority_id, priority,
          is_hidden_idea, is_suggestion, is_substitution, substitution_for_item_id,
          allow_substitutions, is_favorite, is_pinned, multi_count,
          desired_quantity, other_users_can_see,
          custom_fields, variations, photos
        )
        VALUES (
          ${input.listId}, ${input.name}, ${input.description},
          ${input.category ?? 'uncategorized'},
          ${input.priorityId ?? null},
          ${input.priority ?? null},
          ${input.isHiddenIdea === true}, FALSE, TRUE, ${input.parentItemId},
          TRUE, ${meta.isFavorite}, ${meta.isPinned}, ${meta.multiCount},
          ${meta.desiredQuantity}, NULL,
          ${sql.json(meta.customFields as never)},
          ${sql.json(meta.variations as never)},
          ${sql.json(meta.photos as never)}
        )
        RETURNING id as "Id"
      `;
      if (!child) throw new Error('Failed to create substitution item');

      const [row] = await tx`
        INSERT INTO item_substitutions (
          parent_item_id, substitution_item_id, kind, created_by_user_id, sort_order
        )
        VALUES (
          ${input.parentItemId}, ${child.Id}, ${input.kind},
          ${input.createdByUserId}, ${input.sortOrder}
        )
        RETURNING id as "Id", parent_item_id as "ParentItemId",
                  substitution_item_id as "SubstitutionItemId", kind as "Kind",
                  created_by_user_id as "CreatedByUserId", sort_order as "SortOrder",
                  created_at as "CreatedAt"
      `;
      if (!row) throw new Error('Failed to create substitution link');
      return mapSubstitutionRow(row);
    });
  }

  async findSubstitutionsByParentId(parentItemId: string): Promise<ItemSubstitutionRow[]> {
    const rows = await sql`
      SELECT id as "Id", parent_item_id as "ParentItemId",
             substitution_item_id as "SubstitutionItemId", kind as "Kind",
             created_by_user_id as "CreatedByUserId", sort_order as "SortOrder",
             created_at as "CreatedAt"
      FROM item_substitutions
      WHERE parent_item_id = ${parentItemId}
      ORDER BY
        CASE WHEN kind = 'owner_approved' THEN 0 ELSE 1 END,
        sort_order ASC,
        created_at ASC
    `;
    return rows.map(mapSubstitutionRow);
  }

  async findSubstitutionsByParentIds(
    parentItemIds: string[]
  ): Promise<Map<string, ItemSubstitutionRow[]>> {
    const map = new Map<string, ItemSubstitutionRow[]>();
    if (parentItemIds.length === 0) return map;

    const rows = await sql`
      SELECT id as "Id", parent_item_id as "ParentItemId",
             substitution_item_id as "SubstitutionItemId", kind as "Kind",
             created_by_user_id as "CreatedByUserId", sort_order as "SortOrder",
             created_at as "CreatedAt"
      FROM item_substitutions
      WHERE parent_item_id = ANY(${parentItemIds})
      ORDER BY
        CASE WHEN kind = 'owner_approved' THEN 0 ELSE 1 END,
        sort_order ASC,
        created_at ASC
    `;
    for (const row of rows) {
      const mapped = mapSubstitutionRow(row);
      const existing = map.get(mapped.ParentItemId) ?? [];
      existing.push(mapped);
      map.set(mapped.ParentItemId, existing);
    }
    return map;
  }

  async findSubstitutionById(id: string): Promise<ItemSubstitutionRow | null> {
    const [row] = await sql`
      SELECT id as "Id", parent_item_id as "ParentItemId",
             substitution_item_id as "SubstitutionItemId", kind as "Kind",
             created_by_user_id as "CreatedByUserId", sort_order as "SortOrder",
             created_at as "CreatedAt"
      FROM item_substitutions
      WHERE id = ${id}
    `;
    return row ? mapSubstitutionRow(row) : null;
  }

  async findSubstitutionByChildItemId(itemId: string): Promise<ItemSubstitutionRow | null> {
    const [row] = await sql`
      SELECT id as "Id", parent_item_id as "ParentItemId",
             substitution_item_id as "SubstitutionItemId", kind as "Kind",
             created_by_user_id as "CreatedByUserId", sort_order as "SortOrder",
             created_at as "CreatedAt"
      FROM item_substitutions
      WHERE substitution_item_id = ${itemId}
    `;
    return row ? mapSubstitutionRow(row) : null;
  }

  async countOwnerApprovedSubstitutions(parentItemId: string): Promise<number> {
    const [row] = await sql`
      SELECT COUNT(*)::int as "Count"
      FROM item_substitutions
      WHERE parent_item_id = ${parentItemId} AND kind = 'owner_approved'
    `;
    return Number(row?.Count ?? 0);
  }

  async hasClaimerCustomSubstitution(parentItemId: string): Promise<boolean> {
    const [row] = await sql`
      SELECT 1 as "Exists"
      FROM item_substitutions
      WHERE parent_item_id = ${parentItemId} AND kind = 'claimer_custom'
      LIMIT 1
    `;
    return !!row;
  }

  async updateSubstitutionSortOrders(parentItemId: string, orderedIds: string[]): Promise<void> {
    await sql.begin(async (tx) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const substitutionId = orderedIds[i];
        if (!substitutionId) continue;
        await tx`
          UPDATE item_substitutions
          SET sort_order = ${i}
          WHERE id = ${substitutionId}
            AND parent_item_id = ${parentItemId}
            AND kind = 'owner_approved'
        `;
      }
    });
  }

  async deleteSubstitution(id: string): Promise<void> {
    const existing = await this.findSubstitutionById(id);
    if (!existing) return;
    await sql.begin(async (tx) => {
      await tx`DELETE FROM item_substitutions WHERE id = ${id}`;
      await tx`DELETE FROM items WHERE id = ${existing.SubstitutionItemId}`;
    });
  }

  async updateAllowSubstitutions(itemId: string, allowSubstitutions: boolean): Promise<void> {
    await sql`
      UPDATE items
      SET allow_substitutions = ${allowSubstitutions}
      WHERE id = ${itemId}
    `;
  }
}
