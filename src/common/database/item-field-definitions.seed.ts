import { sql } from './connection';

interface FieldDefinitionSeed {
  category: 'clothing' | 'tech';
  fieldKey: string;
  label: string;
  placeholder: string;
  displayOrder: number;
}

interface FieldDependencySeed {
  category: 'clothing' | 'tech';
  fieldKey: string;
  triggerFieldKey: string;
  triggerValue: string;
}

const ITEM_FIELD_DEFINITION_SEEDS: readonly FieldDefinitionSeed[] = [
  {
    category: 'clothing',
    fieldKey: 'PantsSize',
    label: 'Pants Size',
    placeholder: 'e.g. 32x30',
    displayOrder: 1,
  },
  {
    category: 'clothing',
    fieldKey: 'WaistFit',
    label: 'Waist Fit',
    placeholder: 'e.g. Slim, Regular, Relaxed',
    displayOrder: 2,
  },
  {
    category: 'clothing',
    fieldKey: 'ShirtSize',
    label: 'Shirt Size',
    placeholder: 'e.g. Medium, 15.5',
    displayOrder: 3,
  },
  {
    category: 'clothing',
    fieldKey: 'ShoesSize',
    label: 'Shoes Size',
    placeholder: 'e.g. 10.5',
    displayOrder: 4,
  },
  {
    category: 'clothing',
    fieldKey: 'SocksSize',
    label: 'Socks Size',
    placeholder: 'e.g. 9-11',
    displayOrder: 5,
  },
  {
    category: 'clothing',
    fieldKey: 'PreferredColor',
    label: 'Preferred Color',
    placeholder: 'e.g. Navy Blue, Matte Black',
    displayOrder: 6,
  },
  {
    category: 'tech',
    fieldKey: 'ModelNumber',
    label: 'Model / Version',
    placeholder: 'e.g. iPhone 15 Pro',
    displayOrder: 1,
  },
  {
    category: 'tech',
    fieldKey: 'StorageCapacity',
    label: 'Storage Capacity',
    placeholder: 'e.g. 256GB, 1TB',
    displayOrder: 2,
  },
  {
    category: 'tech',
    fieldKey: 'PreferredColor',
    label: 'Preferred Color',
    placeholder: 'e.g. Space Gray, Silver',
    displayOrder: 3,
  },
];

const ITEM_FIELD_DEPENDENCY_SEEDS: readonly FieldDependencySeed[] = [
  {
    category: 'clothing',
    fieldKey: 'WaistFit',
    triggerFieldKey: 'PantsSize',
    triggerValue: 'any',
  },
  {
    category: 'tech',
    fieldKey: 'StorageCapacity',
    triggerFieldKey: 'ModelNumber',
    triggerValue: 'any',
  },
];

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
