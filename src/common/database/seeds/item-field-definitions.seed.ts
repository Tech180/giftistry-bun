import {
  ITEM_FIELD_DEFINITION_SEEDS,
  ITEM_FIELD_DEPENDENCY_SEEDS,
} from '../constants/item-field-definition-seeds.constant';
import { sql } from '../utils/sql-proxy.util';

export async function ensureFieldDefinitions(dbSql: typeof sql = sql): Promise<void> {
  for (const field of ITEM_FIELD_DEFINITION_SEEDS) {
    await dbSql`
      INSERT INTO item_field_definitions (category, field_key, label, placeholder, display_order)
      SELECT ${field.category}, ${field.fieldKey}, ${field.label}, ${field.placeholder}, ${field.displayOrder}
      WHERE NOT EXISTS (
        SELECT 1 FROM item_field_definitions
        WHERE category = ${field.category} AND field_key = ${field.fieldKey}
      );
    `;
  }

  for (const dependency of ITEM_FIELD_DEPENDENCY_SEEDS) {
    await dbSql`
      INSERT INTO item_field_dependencies (dependent_field_id, trigger_field_key, trigger_value)
      SELECT d.id, ${dependency.triggerFieldKey}, ${dependency.triggerValue}
      FROM item_field_definitions d
      WHERE d.category = ${dependency.category}
        AND d.field_key = ${dependency.fieldKey}
        AND NOT EXISTS (
          SELECT 1 FROM item_field_dependencies dep
          WHERE dep.dependent_field_id = d.id
            AND dep.trigger_field_key = ${dependency.triggerFieldKey}
            AND dep.trigger_value = ${dependency.triggerValue}
        );
    `;
  }
}
