import type { FieldDependency } from './field-dependency.interface';

export interface FieldDefinition {
  Id: string;
  Category: string;
  FieldKey: string;
  Label: string;
  Placeholder: string | null;
  DisplayOrder: number;
  Dependencies?: FieldDependency[];
}
