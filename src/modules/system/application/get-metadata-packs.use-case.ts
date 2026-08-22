import type { ServerConfigRepository } from '../domain/ports/server-config.repository';
import {
  catalogForConfig,
  isCustomPackId,
  sanitizeEnabledPackIdsForConfig,
  type MetadataPack,
} from '../domain/packs';

export interface MetadataPackFieldView {
  Key: string;
  Label: string;
  Bucket: 'predefined' | 'userDefined';
  Hint?: string;
}

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

export interface MetadataPacksResult {
  Catalog: MetadataPackView[];
  EnabledPackIds: string[];
}

function toPackView(pack: MetadataPack): MetadataPackView {
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
    view.Children = pack.children.map(toPackView);
  }
  return view;
}

export class GetMetadataPacksUseCase {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  execute(): MetadataPacksResult {
    const config = this.serverConfigRepo.load();
    const catalog = catalogForConfig(config);
    return {
      Catalog: catalog.map(toPackView),
      EnabledPackIds: sanitizeEnabledPackIdsForConfig(config),
    };
  }
}
