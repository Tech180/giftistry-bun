import type { ItemFieldRepository } from '../../domain/ports/item-field.repository';
import type { FieldDefinition } from '../../domain/interfaces/field-definition.interface';
import type { FieldDependency } from '../../domain/interfaces/field-dependency.interface';
import { sql } from '@/common/database';

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
