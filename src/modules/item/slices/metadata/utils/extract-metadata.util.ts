import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth';
import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import type { ScrapeResult } from '../../../domain/interfaces/scrape-result.interface';
import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { AiPopulateStatus } from '../../../domain/types/ai-populate-status.type';
import { coerceApparelSizeFields } from '../../../domain/utils/coerce-apparel-size-fields.util';
import { mapScrapeToCustomFields } from '../../../domain/utils/map-scrape-to-custom-fields.util';
import { polishGiftFacingMetadata } from '../../../domain/utils/polish-gift-facing-metadata.util';
import { resolveDesiredQuantity } from '../../../domain/utils/parse-pack-quantity.util';
import {
  resolveCategoryAlternatives,
  resolveItemCategory,
} from '../../../domain/utils/resolve-item-category.util';

export function attachScrapeCustomFields(data: ExtractedMetadata, url: string): ExtractedMetadata {
  const mapped = mapScrapeToCustomFields(data, url);
  return {
    ...data,
    predefinedFields: {
      ...(data.predefinedFields ?? {}),
      ...mapped.predefinedFields,
    },
    userDefinedFields: {
      ...(data.userDefinedFields ?? {}),
      ...mapped.userDefinedFields,
    },
  };
}

export function buildFieldsFound(data: ExtractedMetadata): string[] {
  const fieldsFound = Object.entries(data)
    .filter(([key, value]) => {
      if (key === 'predefinedFields' || key === 'userDefinedFields') return false;
      if (value == null) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      return true;
    })
    .map(([key]) => key);

  if (data.predefinedFields && Object.keys(data.predefinedFields).length > 0) {
    fieldsFound.push('predefinedFields');
  }
  if (data.userDefinedFields && Object.keys(data.userDefinedFields).length > 0) {
    fieldsFound.push('userDefinedFields');
  }

  return fieldsFound;
}

export function withAiPopulate(
  diagnostics: ScrapeResult['diagnostics'],
  aiPopulate: AiPopulateStatus
): ScrapeResult['diagnostics'] {
  return { ...diagnostics, aiPopulate };
}

export function finalizeExtractedData(
  data: ExtractedMetadata,
  url: string,
  diagnostics: ScrapeResult['diagnostics'],
  websiteName?: string,
  existingCategories: string[] = [],
  finalUrl?: string
): ScrapeResult {
  let finalized = attachScrapeCustomFields(data, url);
  finalized = polishGiftFacingMetadata(finalized);
  const mapped = mapScrapeToCustomFields(finalized, url);
  finalized = {
    ...finalized,
    category: resolveItemCategory(finalized.category, existingCategories),
    categoryAlternatives: resolveCategoryAlternatives(
      finalized.categoryAlternatives,
      finalized.category || 'uncategorized',
      existingCategories
    ),
    predefinedFields: coerceApparelSizeFields({
      predefinedFields: finalized.predefinedFields ?? {},
      url,
      title: finalized.title || '',
      category: finalized.category,
      size: finalized.size,
      scrapePreferredKey: mapped.apparelSizeKey,
    }),
    desiredQuantity:
      resolveDesiredQuantity(finalized.desiredQuantity, finalized.title) ??
      finalized.desiredQuantity ??
      null,
  };
  return {
    data: finalized,
    diagnostics: {
      ...diagnostics,
      fieldsFound: buildFieldsFound(finalized),
    },
    websiteName,
    finalUrl: finalUrl ?? url,
  };
}

export async function userAllowsAi(
  userId: string,
  userRepo: UserRepository,
  assertUserCan: AssertUserCanUseCase
): Promise<boolean> {
  const user = await userRepo.findById(userId);
  if (!user || user.AiEnabled === false) return false;
  try {
    await assertUserCan.execute(userId, 'CanUseAiFeatures');
    return true;
  } catch {
    return false;
  }
}

export async function loadExistingCategories(
  listId: string | undefined,
  itemRepo: ItemRepository
): Promise<string[]> {
  if (!listId) return [];
  try {
    const items = await itemRepo.findByListId(listId);
    return Array.from(
      new Set(
        items
          .map((item) => item.Category)
          .filter((category): category is string => !!category && category !== 'uncategorized')
      )
    );
  } catch {
    return [];
  }
}
