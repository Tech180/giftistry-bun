import type { CustomPackFieldSettingsDto } from './custom-pack-field-settings-dto.interface';
import type { CustomPackMatchSettingsDto } from './custom-pack-match-settings-dto.interface';

export interface CustomPackSettingsDto {
  Id: string;
  Label: string;
  Description: string;
  Match: CustomPackMatchSettingsDto;
  Fields: CustomPackFieldSettingsDto[];
  PromptFragment: string;
}
