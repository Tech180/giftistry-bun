import type { ItemReviewRepository } from '../../domain/ports/item-review.repository';
import type { ItemReview } from '../../domain/interfaces/item-review.interface';
import type { ReviewData } from '../../domain/interfaces/review-data.interface';
import { sql } from '@/common/database';
import { parseJsonField } from '@/common/utils/parse-json-field.util';

export class PostgresItemReviewRepository implements ItemReviewRepository {
  async findByItemId(itemId: string): Promise<ItemReview | null> {
    const [row] = await sql<any[]>`
      SELECT item_id as "ItemId", summary as "Summary", pros as "Pros", cons as "Cons", reviews as "Reviews"
      FROM item_reviews
      WHERE item_id = ${itemId}
    `;
    if (!row) return null;
    return {
      ItemId: row.ItemId,
      Summary: row.Summary,
      Pros: row.Pros ?? [],
      Cons: row.Cons ?? [],
      Reviews: parseJsonField(row.Reviews, []),
    };
  }

  async exists(itemId: string): Promise<boolean> {
    const [row] = await sql<any[]>`
      SELECT id FROM item_reviews WHERE item_id = ${itemId}
    `;
    return !!row;
  }

  async save(itemId: string, data: ReviewData): Promise<void> {
    await sql`
      INSERT INTO item_reviews (item_id, summary, pros, cons, reviews)
      VALUES (
        ${itemId},
        ${data.summary},
        ${sql.array(data.pros)},
        ${sql.array(data.cons)},
        ${JSON.stringify(data.reviews)}
      )
      ON CONFLICT (item_id) DO UPDATE
      SET summary = EXCLUDED.summary,
          pros = EXCLUDED.pros,
          cons = EXCLUDED.cons,
          reviews = EXCLUDED.reviews,
          updated_at = CURRENT_TIMESTAMP
    `;
  }

  async findItemsNeedingBackfill(listId: string): Promise<Array<{ itemId: string; url: string }>> {
    const rows = await sql<any[]>`
      SELECT i.id as "itemId", il.url
      FROM items i
      JOIN item_links il ON i.id = il.item_id
      LEFT JOIN item_reviews ir ON i.id = ir.item_id
      WHERE i.list_id = ${listId} AND ir.id IS NULL
    `;
    return rows.map(row => ({
      itemId: row.itemId,
      url: row.url,
    }));
  }
}
