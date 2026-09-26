import type { ServerConfigRepository } from '@/modules/system';
import { resolveAiConnection, isAiSlotConfigured } from '@/common/utils/resolve-ai-connection.util';
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
  resolveMetadataPacks,
  sanitizeEnabledPackIdsForConfig,
} from '@/modules/system';
import type { ExtractMetadataOptions } from '../interfaces/extract-metadata-options.interface';
import type { ExtractMetadataProgress } from '../interfaces/extract-metadata-progress.interface';
import {
  attachScrapeCustomFields,
  finalizeExtractedData,
  loadExistingCategories,
  userAllowsAi,
  withAiPopulate,
} from '../utils/extract-metadata.util';

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
    const scrapeResult = await this.metadataScraper.scrape(url, 'full');
    const resolvedUrl = scrapeResult.finalUrl?.trim() || url;
    const config = this.configRepo.load();
    const existingCategories = await loadExistingCategories(options.listId, this.itemRepo);
    const scrapeWithFields = attachScrapeCustomFields(scrapeResult.data, resolvedUrl);
    const scrapeApparelKey = mapScrapeToCustomFields(scrapeResult.data, resolvedUrl).apparelSizeKey;
    const fastConnection = resolveAiConnection(config, 'fast');

    const serverAiReady = config.AiEnabled && isAiSlotConfigured(fastConnection);
    const aiAllowed = serverAiReady && (await userAllowsAi(userId, this.userRepo, this.assertUserCan));

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

    const pageHtml = scrapeResult.html?.trim()
      ? scrapeResult.html
      : await this.pageContextFetcher.fetchHtml(resolvedUrl);
    const websiteName =
      scrapeResult.websiteName ??
      this.pageContextFetcher.resolveWebsiteName(resolvedUrl, pageHtml);
    const pageContext = pageHtml
      ? this.pageContextFetcher.buildContextFromHtml(pageHtml, resolvedUrl)
      : await this.pageContextFetcher.fetchContext(resolvedUrl);
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

    if (!shouldPopulate && !enableWebSearch) {
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
    if (enableWebSearch && this.productResearcher) {
      try {
        await report({ phase: 'researching' });
        const researched = await this.productResearcher.research({
          itemName: scrapeWithFields.title || '',
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

    if (!shouldPopulate && !searchContext) {
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
      const customPrompt = composePopulateWithPacks(config.AiPopulatePrompt || '', packs);
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
      console.error('[AI Populate] Failed to enrich scrape result:', err);
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
