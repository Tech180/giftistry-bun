export interface FieldDefinition {
  Id: string;
  Category: string;
  FieldKey: string;
  Label: string;
  Placeholder: string | null;
  DisplayOrder: number;
  Dependencies?: FieldDependency[];
}

export interface FieldDependency {
  Id: string;
  DependentFieldId: string;
  TriggerFieldKey: string;
  TriggerValue: string;
}
