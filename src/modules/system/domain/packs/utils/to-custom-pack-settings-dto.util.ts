import type { CustomPackSettingsDto } from '../interfaces/custom-pack-settings-dto.interface';
import type { MetadataPack } from '../interfaces/metadata-pack.interface';

export function toCustomPackSettingsDto(pack: MetadataPack): CustomPackSettingsDto {
  return {
    Id: pack.id,
    Label: pack.label,
    Description: pack.description,
    Match: {
      Categories: [...pack.match.categories],
      ...(pack.match.titleKeywords ? { TitleKeywords: [...pack.match.titleKeywords] } : {}),
    },
    Fields: pack.fields.map((field) => ({
      Key: field.key,
      Label: field.label,
      Bucket: field.bucket,
      ...(field.hint ? { Hint: field.hint } : {}),
    })),
    PromptFragment: pack.promptFragment,
  };
}
