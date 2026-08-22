import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import { resolveAiConnection, isAiSlotConfigured } from '@/common/utils/resolve-ai-connection.util';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { MetadataScraper, ScrapeResult } from '../domain/ports/metadata-scraper.port';
import type { MetadataPopulator } from '../domain/ports/metadata-populator.port';
import type { CategoryClassifier, CategoryClassificationResult } from '../domain/ports/category-classifier.port';
import type { ProductResearcher } from '../domain/ports/product-researcher.port';
import type { PageContextFetcher } from '../domain/ports/page-context.port';
import type { ItemRepository } from '../domain/ports/item.repository';
import type { AiPopulateStatus, ExtractedMetadata } from '../domain/extracted-metadata';
import { mergeExtractedMetadata, shouldRunAiPopulate } from '../domain/merge-extracted-metadata';
import { normalizeCategoryLabel } from '../domain/normalize-category-label.util';
import { mapScrapeToCustomFields } from '../domain/map-scrape-to-custom-fields';
import { resolveWebSearchForExtract } from '@/common/application/user-web-search-access.util';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import {
  resolveCategoryAlternatives,
  resolveItemCategory,
} from '../domain/resolve-item-category.util';
import { coerceApparelSizeFields } from '../domain/coerce-apparel-size-fields.util';
import { resolveDesiredQuantity } from '../domain/parse-pack-quantity.util';
import {
  catalogForConfig,
  composePopulateWithPacks,
  resolveMetadataPacks,
  sanitizeEnabledPackIdsForConfig,
} from '@/modules/system/domain/packs';

export type ExtractMetadataPhase =
  | 'scraping'
  | 'categorizing'
  | 'researching'
  | 'populating';

export interface ExtractMetadataProgress {
  phase: ExtractMetadataPhase;
  tokensPerSecond?: number | null;
}

export interface ExtractMetadataOptions {
  listId?: string;
  onProgress?: (update: ExtractMetadataProgress) => void | Promise<void>;
}

function attachScrapeCustomFields(data: ExtractedMetadata, url: string): ExtractedMetadata {
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

function buildFieldsFound(data: ExtractedMetadata): string[] {
  const fieldsFound = Object.entries(data).filter(([key, value]) => {
    if (key === 'predefinedFields' || key === 'userDefinedFields') return false;
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  }).map(([key]) => key);

  if (data.predefinedFields && Object.keys(data.predefinedFields).length > 0) {
    fieldsFound.push('predefinedFields');
  }
  if (data.userDefinedFields && Object.keys(data.userDefinedFields).length > 0) {
    fieldsFound.push('userDefinedFields');
  }

  return fieldsFound;
}

function withAiPopulate(
  diagnostics: ScrapeResult['diagnostics'],
  aiPopulate: AiPopulateStatus
): ScrapeResult['diagnostics'] {
  return { ...diagnostics, aiPopulate };
}

function finalizeExtractedData(
  data: ExtractedMetadata,
  url: string,
  diagnostics: ScrapeResult['diagnostics'],
  websiteName?: string,
  existingCategories: string[] = []
): ScrapeResult {
  let finalized = attachScrapeCustomFields(data, url);
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
  };
}

async function userAllowsAi(
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

async function loadExistingCategories(
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
    const config = this.configRepo.load();
    const existingCategories = await loadExistingCategories(options.listId, this.itemRepo);
    const scrapeWithFields = attachScrapeCustomFields(scrapeResult.data, url);
    const scrapeApparelKey = mapScrapeToCustomFields(scrapeResult.data, url).apparelSizeKey;
    const fastConnection = resolveAiConnection(config, 'fast');

    const serverAiReady = config.AiEnabled && isAiSlotConfigured(fastConnection);
    const aiAllowed = serverAiReady && (await userAllowsAi(userId, this.userRepo, this.assertUserCan));

    if (!aiAllowed) {
      return finalizeExtractedData(
        scrapeResult.data,
        url,
        withAiPopulate(scrapeResult.diagnostics, 'skipped'),
        this.pageContextFetcher.resolveWebsiteName(url),
        existingCategories
      );
    }

    const { provider, apiKey, model, endpoint } = fastConnection;

    const pageHtml = await this.pageContextFetcher.fetchHtml(url);
    const websiteName = this.pageContextFetcher.resolveWebsiteName(url, pageHtml);
    const pageContext = pageHtml
      ? this.pageContextFetcher.buildContextFromHtml(pageHtml, url)
      : await this.pageContextFetcher.fetchContext(url);
    let aiCategoryResult: CategoryClassificationResult = {
      category: normalizeCategoryLabel(scrapeWithFields.category || 'uncategorized'),
      alternatives: [],
    };

    try {
      await report({ phase: 'categorizing' });
      aiCategoryResult = await this.categoryClassifier.classify(
        {
          url,
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
        url,
        withAiPopulate(scrapeResult.diagnostics, 'skipped'),
        websiteName,
        existingCategories
      );
    }

    let searchContext: string | undefined;
    if (enableWebSearch && this.productResearcher) {
      try {
        await report({ phase: 'researching' });
        const researched = await this.productResearcher.research({
          itemName: scrapeWithFields.title || '',
          websiteName,
          url,
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
        url,
        withAiPopulate(scrapeResult.diagnostics, 'skipped'),
        websiteName,
        existingCategories
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
          url,
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

      const preferScrape = scrapeResult.diagnostics.confidence === 'high';
      const merged = mergeExtractedMetadata(
        { ...scrapeWithFields, category: null },
        aiData,
        preferScrape,
        { url, scrapeApparelSizeKey: scrapeApparelKey }
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
        url,
        withAiPopulate(
          {
            ...scrapeResult.diagnostics,
            confidence: finalData.title ? 'medium' : scrapeResult.diagnostics.confidence,
          },
          'succeeded'
        ),
        websiteName,
        existingCategories
      );
    } catch (err) {
      console.error('[AI Populate] Failed to enrich scrape result:', err);
      return finalizeExtractedData(
        baseData,
        url,
        withAiPopulate(scrapeResult.diagnostics, 'failed'),
        websiteName,
        existingCategories
      );
    }
  }
}
