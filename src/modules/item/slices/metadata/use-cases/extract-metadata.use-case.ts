import type { ServerConfigRepository } from '@/modules/system';
import {
  resolveAiConnection,
  isAiSlotConfigured,
} from '@/common/utils/resolve-ai-connection.util';
import { probeAiReachability } from '@/common/utils/probe-ai-reachability.util';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth';
import type { MetadataScraper } from '../../../domain/ports/metadata-scraper.port';
import type { ScrapeResult } from '../../../domain/interfaces/scrape-result.interface';
import type { MetadataPopulator } from '../../../domain/ports/metadata-populator.port';
import type { CategoryClassifier } from '../../../domain/ports/category-classifier.port';
import type { CategoryClassificationResult } from '../../../domain/interfaces/category-classification-result.interface';
import type { ProductResearcher } from '../../../domain/ports/product-researcher.port';
import type { PageContextFetcher } from '../../../domain/ports/page-context.port';
import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import {
  mergeExtractedMetadata,
  shouldRunAiPopulate,
  isEmptyAiPopulateResult,
} from '../../../domain/utils/merge-extracted-metadata.util';
import { normalizeCategoryLabel } from '../../../domain/utils/normalize-category-label.util';
import { mapScrapeToCustomFields } from '../../../domain/utils/map-scrape-to-custom-fields.util';
import { resolveWebSearchForExtract } from '@/common/application/utils/user-web-search-access.util';
import type { WishlistRepository } from '@/modules/wishlist';
import {
  resolveCategoryAlternatives,
  resolveItemCategory,
} from '../../../domain/utils/resolve-item-category.util';
import { resolveDesiredQuantity } from '../../../domain/utils/parse-pack-quantity.util';
import {
  catalogForConfig,
  composePopulateWithPacks,
  resolveAiMetadataExtractionOptions,
  resolveMetadataPacks,
  sanitizeEnabledPackIdsForConfig,
} from '@/modules/system';
import { ScrapeError } from '../../../infrastructure/scraping/errors/scrape-error';
import { resolveScrapeFinalUrl } from '../../../infrastructure/scraping/utils/resolve-scrape-final-url.util';
import {
  parseAmazonAsinFromUrl,
  resolveScrapeRedirectUrl,
} from '../../../infrastructure/scraping/utils/amazon-scrape-url.util';
import type { ExtractMetadataOptions } from '../interfaces/extract-metadata-options.interface';
import type { ExtractMetadataProgress } from '../interfaces/extract-metadata-progress.interface';
import {
  attachScrapeCustomFields,
  finalizeExtractedData,
  loadExistingCategories,
  userAllowsAi,
  withAiPopulate,
} from '../utils/extract-metadata.util';
import {
  blockedAiFallbackTrusted,
  buildBlockedPageContext,
  buildBlockedScrapeFallback,
} from '../utils/blocked-scrape-fallback.util';
import { formatScrapeFactsForAi, shouldAttachScrapeFacts } from '../../../domain/utils/format-scrape-facts-for-ai.util';
import { trimPageContextForAi } from '../../../domain/utils/trim-page-context-for-ai.util';

export class ExtractMetadataUseCase {
  constructor(
    private metadataScraper: MetadataScraper,
    private metadataPopulator: MetadataPopulator,
    private categoryClassifier: CategoryClassifier,
    private userRepo: UserRepository,
    private assertUserCan: AssertUserCanUseCase,
    private wishlistRepo: WishlistRepository,
    private itemRepo: ItemRepository,
    private configRepo: ServerConfigRepository,
    private pageContextFetcher: PageContextFetcher,
    private productResearcher?: ProductResearcher
  ) {}

  willUseWebSearch(userId: string, listId?: string): Promise<boolean> {
    return resolveWebSearchForExtract(
      userId,
      listId,
      this.userRepo,
      this.wishlistRepo,
      this.assertUserCan,
      this.configRepo.load()
    );
  }

  async execute(
    url: string,
    userId: string,
    options: ExtractMetadataOptions = {}
  ): Promise<ScrapeResult> {
    const report = async (update: ExtractMetadataProgress) => {
      await options.onProgress?.(update);
    };

    await report({ phase: 'scraping' });

    const config = this.configRepo.load();
    const fastConnection = resolveAiConnection(config, 'fast');
    const serverAiReady = config.AiEnabled && isAiSlotConfigured(fastConnection);
    const aiAllowed = serverAiReady && (await userAllowsAi(userId, this.userRepo, this.assertUserCan));

    let scrapeResult: ScrapeResult;
    let blockedScrapeError: ScrapeError | null = null;

    try {
      scrapeResult = await this.metadataScraper.scrape(url, 'full');
    } catch (err) {
      if (!(err instanceof ScrapeError) || !err.diagnostics?.blocked) {
        throw err;
      }
      if (!aiAllowed) {
        throw err;
      }

      blockedScrapeError = err;
      let resolvedUrl = url;
      if (err.diagnostics.finalUrl) {
        const safe = resolveScrapeFinalUrl(err.diagnostics.finalUrl, url);
        if (safe) {
          resolvedUrl = safe;
        }
      } else {
        try {
          const redirected = await resolveScrapeRedirectUrl(url);
          const safe = resolveScrapeFinalUrl(redirected.finalUrl, url);
          if (safe) {
            resolvedUrl = safe;
          }
        } catch {
          /* keep url */
        }
      }
      scrapeResult = buildBlockedScrapeFallback(resolvedUrl, err.diagnostics);
    }

    const resolvedUrl = scrapeResult.finalUrl?.trim() || url;
    const existingCategories = await loadExistingCategories(options.listId, this.itemRepo);
    const scrapeWithFields = attachScrapeCustomFields(scrapeResult.data, resolvedUrl);
    const scrapeApparelKey = mapScrapeToCustomFields(scrapeResult.data, resolvedUrl).apparelSizeKey;
    const isBlocked = Boolean(scrapeResult.diagnostics.blocked);

    if (!aiAllowed) {
      return finalizeExtractedData(
        scrapeResult.data,
        resolvedUrl,
        withAiPopulate(scrapeResult.diagnostics, 'skipped'),
        scrapeResult.websiteName ?? this.pageContextFetcher.resolveWebsiteName(resolvedUrl),
        existingCategories,
        resolvedUrl
      );
    }

    const reachable = await probeAiReachability(fastConnection);
    if (!reachable) {
      if (blockedScrapeError) {
        throw blockedScrapeError;
      }
      console.warn('[AI] Fast provider unreachable; returning scrape-only result');
      return finalizeExtractedData(
        scrapeWithFields,
        resolvedUrl,
        withAiPopulate(scrapeResult.diagnostics, 'skipped'),
        scrapeResult.websiteName ?? this.pageContextFetcher.resolveWebsiteName(resolvedUrl),
        existingCategories,
        resolvedUrl
      );
    }

    const { provider, apiKey, model, endpoint } = fastConnection;
    const extraction = resolveAiMetadataExtractionOptions(config);

    let pageHtml: string | undefined;
    let pageContext: string;
    if (isBlocked) {
      pageHtml = undefined;
      pageContext = buildBlockedPageContext(resolvedUrl);
    } else {
      pageHtml = scrapeResult.html?.trim()
        ? scrapeResult.html
        : await this.pageContextFetcher.fetchHtml(resolvedUrl);
      pageContext = pageHtml
        ? this.pageContextFetcher.buildContextFromHtml(pageHtml, resolvedUrl)
        : await this.pageContextFetcher.fetchContext(resolvedUrl);
    }

    if (shouldAttachScrapeFacts(scrapeResult, extraction)) {
      const facts = formatScrapeFactsForAi(scrapeWithFields);
      if (facts) {
        pageContext = `${facts}\n\n${pageContext}`;
      }
    }
    pageContext = trimPageContextForAi(pageContext, extraction);

    const websiteName =
      scrapeResult.websiteName ??
      this.pageContextFetcher.resolveWebsiteName(resolvedUrl, pageHtml);

    let aiCategoryResult: CategoryClassificationResult = {
      category: normalizeCategoryLabel(scrapeWithFields.category || 'uncategorized'),
      alternatives: [],
    };

    try {
      await report({ phase: 'categorizing' });
      aiCategoryResult = await this.categoryClassifier.classify(
        {
          url: resolvedUrl,
          websiteName,
          pageContext,
          itemName: scrapeWithFields.title || '',
          existingCategories,
        },
        {
          provider,
          apiKey,
          model,
          customPrompt: config.AiCategoryPrompt || '',
          endpoint,
          extractionOptions: extraction,
          onDelta: async (delta) => {
            await report({
              phase: 'categorizing',
              tokensPerSecond: delta.tokensPerSecond,
            });
          },
        }
      );
    } catch (err) {
      console.error('[AI Category] Failed to classify item:', err);
    }

    const resolvedCategory = resolveItemCategory(aiCategoryResult.category, existingCategories);
    const resolvedAlternatives = resolveCategoryAlternatives(
      aiCategoryResult.alternatives,
      resolvedCategory,
      existingCategories
    );

    const baseData: ExtractedMetadata = {
      ...scrapeWithFields,
      category: resolvedCategory || scrapeWithFields.category,
      categoryAlternatives: resolvedAlternatives,
      desiredQuantity: resolveDesiredQuantity(null, scrapeWithFields.title),
    };

    const shouldPopulate = shouldRunAiPopulate(
      { data: scrapeResult.data, diagnostics: scrapeResult.diagnostics },
      scrapeWithFields,
      true
    );
    const enableWebSearch = await resolveWebSearchForExtract(
      userId,
      options.listId,
      this.userRepo,
      this.wishlistRepo,
      this.assertUserCan,
      config
    );

    if (!shouldPopulate && !enableWebSearch && !isBlocked) {
      return finalizeExtractedData(
        baseData,
        resolvedUrl,
        withAiPopulate(scrapeResult.diagnostics, 'skipped'),
        websiteName,
        existingCategories,
        resolvedUrl
      );
    }

    let searchContext: string | undefined;
    // When blocked, shouldPopulate is already true; still gate research on web-search permission.
    if (enableWebSearch && this.productResearcher) {
      try {
        await report({ phase: 'researching' });
        const researched = await this.productResearcher.research({
          itemName:
            scrapeWithFields.title || parseAmazonAsinFromUrl(resolvedUrl) || '',
          websiteName,
          url: resolvedUrl,
        });
        if (researched.trim() && researched.trim() !== 'None') {
          searchContext = researched;
        }
      } catch (err) {
        console.error('[Web Search] Failed to research product:', err);
      }
    }

    if (!shouldPopulate && !searchContext && !isBlocked) {
      return finalizeExtractedData(
        baseData,
        resolvedUrl,
        withAiPopulate(scrapeResult.diagnostics, 'skipped'),
        websiteName,
        existingCategories,
        resolvedUrl
      );
    }

    try {
      await report({ phase: 'populating' });
      const catalog = catalogForConfig(config);
      const enabledPackIds = sanitizeEnabledPackIdsForConfig(config);
      const packs = resolveMetadataPacks({
        enabledPackIds,
        category: resolvedCategory,
        itemName: scrapeWithFields.title || '',
        catalog,
      });
      // Full/single-call: packs go in the custom prompt. Thorough/split: packs
      // are passed separately and handled by the populate strategy.
      const customPrompt = extraction.splitCalls
        ? config.AiPopulatePrompt || ''
        : composePopulateWithPacks(config.AiPopulatePrompt || '', packs);
      const aiData = await this.metadataPopulator.populate(
        {
          url: resolvedUrl,
          websiteName,
          pageContext,
          searchContext,
          itemName: scrapeWithFields.title || '',
          category: resolvedCategory,
          reconcileSources: Boolean(searchContext),
        },
        {
          provider,
          apiKey,
          model,
          customPrompt,
          endpoint,
          linkedDescriptionPrompt: config.AiDescriptionPrompt || '',
          linkedCategoryPrompt: config.AiCategoryPrompt || '',
          extractionOptions: extraction,
          packs: extraction.splitCalls ? packs : undefined,
          onDelta: async (delta) => {
            await report({
              phase: 'populating',
              tokensPerSecond: delta.tokensPerSecond,
            });
          },
        }
      );

      if (isEmptyAiPopulateResult(aiData)) {
        console.warn('[AI Populate] Empty populate result; keeping scrape fields');
        if (blockedScrapeError) {
          throw blockedScrapeError;
        }
        return finalizeExtractedData(
          baseData,
          resolvedUrl,
          withAiPopulate(scrapeResult.diagnostics, 'failed'),
          websiteName,
          existingCategories,
          resolvedUrl
        );
      }

      const preferScrape = scrapeResult.diagnostics.confidence === 'high';
      const merged = mergeExtractedMetadata(
        { ...scrapeWithFields, category: null },
        aiData,
        preferScrape,
        { url: resolvedUrl, scrapeApparelSizeKey: scrapeApparelKey }
      );

      const finalData: ExtractedMetadata = {
        ...merged,
        category: resolvedCategory || merged.category || scrapeWithFields.category,
        categoryAlternatives: resolvedAlternatives,
        desiredQuantity: resolveDesiredQuantity(
          merged.desiredQuantity,
          merged.title,
          scrapeWithFields.title
        ),
      };

      if (
        isBlocked &&
        !blockedAiFallbackTrusted(finalData, { searchContext, pageContext })
      ) {
        if (blockedScrapeError) {
          throw blockedScrapeError;
        }
        throw new ScrapeError('Both strategies failed: blocked-ai-fallback-empty', {
          blocked: true,
          validationReason: scrapeResult.diagnostics.validationReason,
          finalUrl: resolvedUrl,
          tier: scrapeResult.diagnostics.source,
        });
      }

      return finalizeExtractedData(
        finalData,
        resolvedUrl,
        withAiPopulate(
          {
            ...scrapeResult.diagnostics,
            confidence: finalData.title ? 'medium' : scrapeResult.diagnostics.confidence,
          },
          'succeeded'
        ),
        websiteName,
        existingCategories,
        resolvedUrl
      );
    } catch (err) {
      if (err instanceof ScrapeError) {
        throw err;
      }
      console.error('[AI Populate] Failed to enrich scrape result:', err);
      if (blockedScrapeError) {
        throw blockedScrapeError;
      }
      return finalizeExtractedData(
        baseData,
        resolvedUrl,
        withAiPopulate(scrapeResult.diagnostics, 'failed'),
        websiteName,
        existingCategories,
        resolvedUrl
      );
    }
  }
}
