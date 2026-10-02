import type { ServerConfigRepository } from '@/modules/system';
import { probeAiReachability } from '@/common/utils/probe-ai-reachability.util';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth';
import type { MetadataScraper } from '../../../domain/ports/metadata-scraper.port';
import type { ScrapeTelemetry } from '../../../domain/ports/scrape-telemetry.port';
import type { ScrapeDiagnostics } from '../../../domain/interfaces/scrape-diagnostics.interface';
import type { AiPopulateStatus } from '../../../domain/types/ai-populate-status.type';
import type { FetchOutcomeKind } from '../../../domain/types/fetch-outcome-kind.type';
import { buildScrapeTelemetryEvent } from '../../../domain/utils/build-scrape-telemetry-event.util';
import type { ScrapeResult } from '../../../domain/interfaces/scrape-result.interface';
import type { MetadataPopulator } from '../../../domain/ports/metadata-populator.port';
import type { CategoryClassifier } from '../../../domain/ports/category-classifier.port';
import type { ProductResearcher } from '../../../domain/ports/product-researcher.port';
import type { PageContextFetcher } from '../../../domain/ports/page-context.port';
import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import { resolveDesiredQuantity } from '../../../domain/utils/parse-pack-quantity.util';
import { mapScrapeToCustomFields } from '../../../domain/utils/map-scrape-to-custom-fields.util';
import { resolveWebSearchForExtract } from '@/common/application/utils/user-web-search-access.util';
import type { WishlistRepository } from '@/modules/wishlist';
import {
  resolveCategoryAlternatives,
  resolveItemCategory,
} from '../../../domain/utils/resolve-item-category.util';
import { resolveAiMetadataExtractionOptions } from '@/modules/system';
import { ScrapeError } from '../../../domain/errors/scrape-error';
import { resolveScrapeFinalUrl } from '../../../domain/utils/scrape-url-safety.util';
import type { ExtractMetadataOptions } from '../interfaces/extract-metadata-options.interface';
import type { ExtractMetadataProgress } from '../interfaces/extract-metadata-progress.interface';
import {
  attachScrapeCustomFields,
  finalizeExtractedData,
  loadExistingCategories,
  withAiPopulate,
} from '../utils/extract-metadata.util';
import {
  blockedAiFallbackTrusted,
  buildBlockedScrapeFallback,
} from '../utils/blocked-scrape-fallback.util';
import { assertSafeScrapeUrlOrThrow } from '../../../domain/utils/assert-safe-scrape-url.util';
import {
  resolveExtractAiEligibility,
  shouldSkipPopulatePath,
  shouldSkipPopulateAfterResearch,
} from '../utils/extract-metadata-eligibility.util';
import { AI_STAGE_MIN_BUDGET_MS } from '../constants/ai-stage-budget.constant';
import { resolveExtractPageContext } from '../utils/extract-metadata-page-context.util';
import {
  buildCategoryClassifierConfig,
  runCategoryAndResearchStage,
} from '../utils/extract-metadata-category-research.util';
import { runExtractPopulateStage } from '../utils/extract-metadata-populate-stage.util';

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
    private productResearcher: ProductResearcher | undefined,
    private scrapeTelemetry: ScrapeTelemetry
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
    assertSafeScrapeUrlOrThrow(url);

    const startedAt = Date.now();
    const extractDeadlineAt =
      options.deadlineMs != null && options.deadlineMs > 0
        ? startedAt + options.deadlineMs
        : undefined;
    /** Remaining caller-supplied budget, or undefined when no deadline was requested. */
    const remainingBudgetMs = (): number | undefined =>
      extractDeadlineAt == null ? undefined : Math.max(0, extractDeadlineAt - Date.now());
    const aiBudgetExhausted = (): boolean => {
      const remaining = remainingBudgetMs();
      return remaining != null && remaining < AI_STAGE_MIN_BUDGET_MS;
    };
    let scrapeAttempted = false;
    let telemetryUrl = url;
    let scrapeDiagnostics: ScrapeDiagnostics | null = null;
    let aiPopulate: AiPopulateStatus = 'skipped';
    let scrapeFinishedAt: number | null = null;
    let telemetryOutcome: FetchOutcomeKind | 'error' = 'ok';

    const report = async (update: ExtractMetadataProgress) => {
      await options.onProgress?.(update);
    };

    await report({ phase: 'scraping' });

    const config = this.configRepo.load();
    const { aiAllowed, fastConnection } = await resolveExtractAiEligibility(
      config,
      userId,
      options.listId,
      this.userRepo,
      this.wishlistRepo,
      this.assertUserCan
    );

    let scrapeResult: ScrapeResult;
    let blockedScrapeError: ScrapeError | null = null;

    try {
      const scrapeOptions = {
        recordTelemetry: false as const,
        deadlineMs: options.deadlineMs,
      };
      scrapeResult = options.capture
        ? await this.metadataScraper.scrapeFromCapture(url, options.capture, 'full', scrapeOptions)
        : await this.metadataScraper.scrape(url, 'full', scrapeOptions);
      scrapeAttempted = true;
      scrapeDiagnostics = scrapeResult.diagnostics;
      telemetryUrl = scrapeResult.finalUrl?.trim() || url;
      telemetryOutcome = scrapeResult.diagnostics.outcome ?? 'ok';
    } catch (err) {
      scrapeAttempted = true;
      if (err instanceof ScrapeError) {
        scrapeDiagnostics = {
          source: err.diagnostics?.tier ?? 'fetch',
          confidence: 'low',
          fieldsFound: [],
          blocked: err.diagnostics?.blocked,
          validationReason: err.diagnostics?.validationReason,
          outcome: err.diagnostics?.outcome,
        };
        telemetryUrl = err.diagnostics?.finalUrl?.trim() || url;
        telemetryOutcome =
          err.diagnostics?.outcome ??
          (err.diagnostics?.blocked ? 'blocked' : 'error');
      } else {
        telemetryOutcome = 'error';
      }
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
          const redirected = await this.metadataScraper.resolveFinalUrl(url);
          if (redirected) {
            resolvedUrl = redirected;
          }
        } catch {
          /* keep url */
        }
      }
      scrapeResult = buildBlockedScrapeFallback(resolvedUrl, err.diagnostics);
      scrapeDiagnostics = scrapeResult.diagnostics;
      telemetryUrl = resolvedUrl;
      telemetryOutcome = 'blocked';
    } finally {
      scrapeFinishedAt = Date.now();
    }

    try {
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

      if (aiBudgetExhausted()) {
        if (blockedScrapeError) {
          throw blockedScrapeError;
        }
        console.warn('[AI] Time budget exhausted after scrape; returning scrape-only result');
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
      if (!isBlocked) {
        pageHtml = scrapeResult.html?.trim()
          ? scrapeResult.html
          : await this.pageContextFetcher.fetchHtml(resolvedUrl);
      }

      const pageContext = await resolveExtractPageContext({
        isBlocked,
        resolvedUrl,
        pageHtml,
        scrapeWithFields,
        scrapeResult,
        extraction,
        fetchContext: (targetUrl) => this.pageContextFetcher.fetchContext(targetUrl),
      });

      const websiteName =
        scrapeResult.websiteName ??
        this.pageContextFetcher.resolveWebsiteName(resolvedUrl, pageHtml);

      const enableWebSearch = await resolveWebSearchForExtract(
        userId,
        options.listId,
        this.userRepo,
        this.wishlistRepo,
        this.assertUserCan,
        config
      );

      if (shouldSkipPopulatePath(scrapeResult, scrapeWithFields, enableWebSearch, isBlocked)) {
        return finalizeExtractedData(
          {
            ...scrapeWithFields,
            desiredQuantity: resolveDesiredQuantity(null, scrapeWithFields.title),
          },
          resolvedUrl,
          withAiPopulate(scrapeResult.diagnostics, 'skipped'),
          websiteName,
          existingCategories,
          resolvedUrl
        );
      }

      const { aiCategoryResult, searchContext } = await runCategoryAndResearchStage(
        {
          resolvedUrl,
          websiteName,
          pageContext,
          itemTitle: scrapeWithFields.title || '',
          existingCategories,
          enableWebSearch,
          fallbackCategory: scrapeWithFields.category || 'uncategorized',
        },
        {
          categoryClassifier: this.categoryClassifier,
          productResearcher: this.productResearcher,
          categoryConfig: buildCategoryClassifierConfig(
            config,
            fastConnection,
            extraction,
            async (delta) => {
              await report({
                phase: 'categorizing',
                tokensPerSecond: delta.tokensPerSecond,
              });
            },
            remainingBudgetMs()
          ),
          onProgress: report,
        }
      );

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

      if (shouldSkipPopulateAfterResearch(scrapeResult, scrapeWithFields, searchContext, isBlocked)) {
        return finalizeExtractedData(
          baseData,
          resolvedUrl,
          withAiPopulate(scrapeResult.diagnostics, 'skipped'),
          websiteName,
          existingCategories,
          resolvedUrl
        );
      }

      if (aiBudgetExhausted()) {
        if (blockedScrapeError) {
          throw blockedScrapeError;
        }
        console.warn('[AI Populate] Time budget exhausted before populate; keeping scrape fields');
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
        const populateOutcome = await runExtractPopulateStage(
          {
            resolvedUrl,
            websiteName,
            pageContext,
            searchContext,
            scrapeWithFields,
            scrapeResult,
            scrapeApparelKey,
            resolvedCategory,
            resolvedAlternatives,
            baseData,
          },
          {
            config,
            extraction,
            metadataPopulator: this.metadataPopulator,
            populatorConfig: {
              provider,
              apiKey,
              model,
              endpoint,
              linkedDescriptionPrompt: config.AiDescriptionPrompt || '',
              linkedCategoryPrompt: config.AiCategoryPrompt || '',
              extractionOptions: extraction,
              ...(remainingBudgetMs() != null ? { timeoutMs: remainingBudgetMs() } : {}),
              onDelta: async (delta) => {
                await report({
                  phase: 'populating',
                  tokensPerSecond: delta.tokensPerSecond,
                });
              },
            },
            onProgress: report,
          }
        );

        if (populateOutcome.kind === 'empty') {
          console.warn('[AI Populate] Empty populate result; keeping scrape fields');
          aiPopulate = 'failed';
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

        const { finalData, droppedFields } = populateOutcome;

        if (
          isBlocked &&
          !blockedAiFallbackTrusted(finalData, { searchContext, pageContext })
        ) {
          aiPopulate = 'failed';
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

        aiPopulate = 'succeeded';
        return finalizeExtractedData(
          finalData,
          resolvedUrl,
          withAiPopulate(
            {
              ...scrapeResult.diagnostics,
              confidence: finalData.title ? 'medium' : scrapeResult.diagnostics.confidence,
              droppedFields: droppedFields.length ? droppedFields : undefined,
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
        aiPopulate = 'failed';
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
    } finally {
      if (scrapeAttempted && scrapeDiagnostics) {
        const finishedAt = Date.now();
        const scrapeEnd = scrapeFinishedAt ?? finishedAt;
        this.scrapeTelemetry.record(
          buildScrapeTelemetryEvent({
            url: telemetryUrl,
            tier: scrapeDiagnostics.source,
            outcome: telemetryOutcome,
            durationMs: finishedAt - startedAt,
            scrapeDurationMs: scrapeEnd - startedAt,
            aiDurationMs: finishedAt - scrapeEnd,
            fieldsFound: scrapeDiagnostics.fieldsFound,
            confidence: scrapeDiagnostics.confidence,
            blockedReason: scrapeDiagnostics.validationReason,
            aiPopulate,
            cacheHit: false,
          })
        );
      }
    }
  }
}
