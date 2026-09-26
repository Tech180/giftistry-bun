import type { MetadataPackFieldView } from './metadata-pack-field-view.interface';
export interface MetadataPackView {
  Id: string;
  Label: string;
  Description: string;
  Match: {
    Categories: string[];
    TitleKeywords?: string[];
  };
  Fields: MetadataPackFieldView[];
  PromptFragment: string;
  IsCustom: boolean;
  Children?: MetadataPackView[];
}
