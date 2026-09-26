import type { MetadataPack } from '../../../domain/packs';
import { isCustomPackId } from '../../../domain/packs';
import type { MetadataPackView } from '../interfaces/metadata-pack-view.interface';

export function toMetadataPackView(pack: MetadataPack): MetadataPackView {
  const view: MetadataPackView = {
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
    IsCustom: isCustomPackId(pack.id),
  };
  if (pack.children?.length) {
    view.Children = pack.children.map(toMetadataPackView);
  }
  return view;
}
