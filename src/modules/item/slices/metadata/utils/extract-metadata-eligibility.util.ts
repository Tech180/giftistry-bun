import type { ServerConfig } from '@/modules/system';
import {
  resolveAiConnection,
  isAiSlotConfigured,
} from '@/common/utils/resolve-ai-connection.util';
import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import type { ScrapeResult } from '../../../domain/interfaces/scrape-result.interface';
import { shouldRunAiPopulate } from '../../../domain/utils/merge-extracted-metadata.util';
import type { WishlistRepository } from '@/modules/wishlist';
import { listAllowsExtractAi } from '@/common/application/utils/user-ai-access.util';
import type { ExtractAiEligibility } from '../interfaces/extract-ai-eligibility.interface';
import { userAllowsAi } from './extract-metadata.util';

export async function resolveExtractAiEligibility(
  config: ServerConfig,
  userId: string,
  listId: string | undefined,
  userRepo: Parameters<typeof userAllowsAi>[1],
  wishlistRepo: WishlistRepository,
  assertUserCan: Parameters<typeof userAllowsAi>[2]
): Promise<ExtractAiEligibility> {
  const fastConnection = resolveAiConnection(config, 'fast');
  const serverAiReady = Boolean(config.AiEnabled) && isAiSlotConfigured(fastConnection);
  const listAllows = await listAllowsExtractAi(listId, wishlistRepo);
  const aiAllowed =
    serverAiReady &&
    listAllows &&
    (await userAllowsAi(userId, userRepo, assertUserCan));
  return { aiAllowed, serverAiReady, fastConnection };
}

export function shouldSkipPopulatePath(
  scrapeResult: ScrapeResult,
  scrapeWithFields: ExtractedMetadata,
  enableWebSearch: boolean,
  isBlocked: boolean
): boolean {
  const shouldPopulate = shouldRunAiPopulate(
    { data: scrapeResult.data, diagnostics: scrapeResult.diagnostics },
    scrapeWithFields,
    true
  );
  if (shouldPopulate || enableWebSearch || isBlocked) {
    return false;
  }
  return true;
}

export function shouldSkipPopulateAfterResearch(
  scrapeResult: ScrapeResult,
  scrapeWithFields: ExtractedMetadata,
  searchContext: string | undefined,
  isBlocked: boolean
): boolean {
  const shouldPopulate = shouldRunAiPopulate(
    { data: scrapeResult.data, diagnostics: scrapeResult.diagnostics },
    scrapeWithFields,
    true
  );
  if (shouldPopulate || searchContext || isBlocked) {
    return false;
  }
  return true;
}
