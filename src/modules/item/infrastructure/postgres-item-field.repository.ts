import type { ItemFieldRepository } from '../domain/ports/item-field.repository';
import type { FieldDefinition, FieldDependency } from '../domain/item-field.entity';
import { sql } from '@/common/database/connection';

export class PostgresItemFieldRepository implements ItemFieldRepository {
  async findDefinitionsByCategory(category: string): Promise<FieldDefinition[]> {
    const lowerCategory = category.toLowerCase();
    const rows = await sql<any[]>`
      SELECT id as "Id", category as "Category", field_key as "FieldKey",
             label as "Label", placeholder as "Placeholder", display_order as "DisplayOrder"
      FROM item_field_definitions
      WHERE LOWER(category) = ${lowerCategory}
      ORDER BY display_order ASC
    `;
    return rows.map(row => ({
      Id: row.Id,
      Category: row.Category,
      FieldKey: row.FieldKey,
      Label: row.Label,
      Placeholder: row.Placeholder,
      DisplayOrder: row.DisplayOrder,
    }));
  }

  async findDependenciesByFieldIds(fieldIds: string[]): Promise<FieldDependency[]> {
    if (fieldIds.length === 0) return [];
    const rows = await sql<any[]>`
      SELECT id as "Id", dependent_field_id as "DependentFieldId",
             trigger_field_key as "TriggerFieldKey", trigger_value as "TriggerValue"
      FROM item_field_dependencies
      WHERE dependent_field_id = ANY(${fieldIds})
    `;
    return rows.map(row => ({
      Id: row.Id,
      DependentFieldId: row.DependentFieldId,
      TriggerFieldKey: row.TriggerFieldKey,
      TriggerValue: row.TriggerValue,
    }));
  }
}
