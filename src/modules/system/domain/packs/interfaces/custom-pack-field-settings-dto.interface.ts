export interface CustomPackFieldSettingsDto {
  Key: string;
  Label: string;
  Bucket: 'predefined' | 'userDefined';
  Hint?: string;
}
