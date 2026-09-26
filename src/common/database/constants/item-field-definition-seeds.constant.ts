import type { FieldDefinitionSeed } from '../interfaces/field-definition-seed.interface';
import type { FieldDependencySeed } from '../interfaces/field-dependency-seed.interface';

export const ITEM_FIELD_DEFINITION_SEEDS: readonly FieldDefinitionSeed[] = [
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

export const ITEM_FIELD_DEPENDENCY_SEEDS: readonly FieldDependencySeed[] = [
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
