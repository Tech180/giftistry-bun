import { FieldDefinition, FieldDependency } from '../item-field.entity';

export interface ItemFieldRepository {
  findDefinitionsByCategory(category: string): Promise<FieldDefinition[]>;
  findDependenciesByFieldIds(fieldIds: string[]): Promise<FieldDependency[]>;
}
export const ITEM_FIELD_REPOSITORY = 'ItemFieldRepository';
