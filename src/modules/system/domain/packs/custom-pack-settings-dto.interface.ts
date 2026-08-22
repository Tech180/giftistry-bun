export interface CustomPackFieldSettingsDto {
  Key: string;
  Label: string;
  Bucket: 'predefined' | 'userDefined';
  Hint?: string;
}

export interface CustomPackMatchSettingsDto {
  Categories: string[];
  TitleKeywords?: string[];
}

export interface CustomPackSettingsDto {
  Id: string;
  Label: string;
  Description: string;
  Match: CustomPackMatchSettingsDto;
  Fields: CustomPackFieldSettingsDto[];
  PromptFragment: string;
}
