import { loadConfig } from '@/common/infrastructure/config.loader';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { MetadataScraper, ScrapeResult } from '../domain/ports/metadata-scraper.port';
import type { MetadataPopulator } from '../domain/ports/metadata-populator.port';
import type { CategoryClassifier } from '../domain/ports/category-classifier.port';
import type { ExtractedMetadata } from '../domain/extracted-metadata';
import {
  fetchPageContext,
  mergeExtractedMetadata,
  shouldRunAiPopulate,
} from '../infrastructure/gemini-metadata-populator';
import { mapScrapeToCustomFields } from '../infrastructure/map-scrape-to-custom-fields';

function extractWebsiteName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const raw = hostname.split('.')[0] || '';
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : '';
  } catch {
    return '';
  }
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

function finalizeExtractedData(
  data: ExtractedMetadata,
  url: string,
  diagnostics: ScrapeResult['diagnostics']
): ScrapeResult {
  const finalized = attachScrapeCustomFields(data, url);
  return {
    data: finalized,
    diagnostics: {
      ...diagnostics,
      fieldsFound: buildFieldsFound(finalized),
    },
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
    await assertUserCan.execute(userId, 'canUseAiFeatures');
    return true;
  } catch {
    return false;
  }
}

export class ExtractMetadataUseCase {
  constructor(
    private metadataScraper: MetadataScraper,
    private metadataPopulator: MetadataPopulator,
    private categoryClassifier: CategoryClassifier,
    private userRepo: UserRepository,
    private assertUserCan: AssertUserCanUseCase
  ) {}

  async execute(url: string, userId: string): Promise<ScrapeResult> {
    const scrapeResult = await this.metadataScraper.scrape(url, 'full');
    const config = loadConfig();
    const scrapeWithFields = attachScrapeCustomFields(scrapeResult.data, url);

    const serverAiReady =
      config.aiEnabled &&
      (config.aiProvider === 'local' || !!(config.aiApiKey || Bun.env.GEMINI_API_KEY));
    const aiAllowed = serverAiReady && (await userAllowsAi(userId, this.userRepo, this.assertUserCan));

    if (!aiAllowed) {
      return finalizeExtractedData(scrapeResult.data, url, scrapeResult.diagnostics);
    }

    const provider = config.aiProvider || 'gemini';
    const apiKey = config.aiApiKey || Bun.env.GEMINI_API_KEY || '';

    const websiteName = extractWebsiteName(url);
    let pageContext = '';
    let aiCategory = scrapeWithFields.category;

    try {
      pageContext = await fetchPageContext(url);
      aiCategory = await this.categoryClassifier.classify(
        {
          url,
          websiteName,
          pageContext,
          itemName: scrapeWithFields.title || '',
        },
        {
          provider,
          apiKey,
          model: config.aiModel || '',
          customPrompt: config.aiCategoryPrompt || '',
          endpoint: config.aiEndpoint || '',
        }
      );
    } catch (err) {
      console.error('[AI Category] Failed to classify item:', err);
    }

    const baseData: ExtractedMetadata = {
      ...scrapeWithFields,
      category: aiCategory || scrapeWithFields.category,
    };

    if (!shouldRunAiPopulate({ data: scrapeResult.data, diagnostics: scrapeResult.diagnostics }, scrapeWithFields, true)) {
      return finalizeExtractedData(baseData, url, scrapeResult.diagnostics);
    }

    try {
      const aiData = await this.metadataPopulator.populate(
        {
          url,
          websiteName,
          pageContext,
          itemName: scrapeWithFields.title || '',
        },
        {
          provider,
          apiKey,
          model: config.aiModel || '',
          customPrompt: config.aiPopulatePrompt || '',
          endpoint: config.aiEndpoint || '',
        }
      );

      const preferScrape = scrapeResult.diagnostics.confidence === 'high';
      const merged = mergeExtractedMetadata(
        { ...scrapeWithFields, category: null },
        aiData,
        preferScrape
      );

      const finalData: ExtractedMetadata = {
        ...merged,
        category: aiCategory || merged.category || scrapeWithFields.category,
      };

      const finalized = finalizeExtractedData(finalData, url, {
        ...scrapeResult.diagnostics,
        confidence: finalData.title ? 'medium' : scrapeResult.diagnostics.confidence,
      });

      return finalized;
    } catch (err) {
      console.error('[AI Populate] Failed to enrich scrape result:', err);
      return finalizeExtractedData(baseData, url, scrapeResult.diagnostics);
    }
  }
}
