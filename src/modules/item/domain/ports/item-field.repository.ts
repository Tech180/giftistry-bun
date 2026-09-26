import type { FieldDefinition } from '../interfaces/field-definition.interface';
import type { FieldDependency } from '../interfaces/field-dependency.interface';

export interface ItemFieldRepository {
  findDefinitionsByCategory(category: string): Promise<FieldDefinition[]>;
  findDependenciesByFieldIds(fieldIds: string[]): Promise<FieldDependency[]>;
}
