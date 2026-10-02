import type { MetadataScraper } from '../../domain/ports/metadata-scraper.port';
import type { MetadataScrapeOptions } from '../../domain/interfaces/metadata-scrape-options.interface';
import type { ScrapeCaptureInput } from '../../domain/interfaces/scrape-capture-input.interface';
import type { ScrapeTelemetry } from '../../domain/ports/scrape-telemetry.port';
import type { ScrapeConfidence } from '../../domain/types/scrape-confidence.type';
import type { ScrapeResult } from '../../domain/interfaces/scrape-result.interface';
import type { ScrapeMode } from '../../domain/types/scrape-mode.type';
import type { ScrapeSource } from '../../domain/types/scrape-source.type';
import { extractMetadata } from '../scraping/extractors/extraction-pipeline';
import { fetchPageHtml } from '../scraping/utils/fetch-page-html.util';
import { ScrapeFetchError } from '../scraping/errors/scrape-fetch-error';
import { playwrightFetchPage } from '../scraping/utils/playwright-fetch-page.util';
import { ScrapeError } from '../../domain/errors/scrape-error';
import { resolveScrapeFinalUrl } from '../../domain/utils/scrape-url-safety.util';
import {
  canonicalizeAmazonProductUrl,
  isAmazonProductPageUrl,
  isAmazonScrapeUrl,
  isAmazonShortLinkHost,
  parseAmazonAsinFromUrl,
  resolveAmazonProductTargetUrl,
} from '../../domain/utils/amazon-url.util';
import { validateScrapeResult } from '../scraping/utils/validate-scrape-result.util';
import { resolveScrapeRedirectUrl } from '../scraping/utils/amazon-scrape-url.util';
import {
  extractOgSiteName,
  resolveWebsiteName,
} from '../scraping/extractors/utils/resolve-website-name.util';
import type { FetchOutcomeKind } from '../../domain/types/fetch-outcome-kind.type';
import { buildScrapeTelemetryEvent } from '../../domain/utils/build-scrape-telemetry-event.util';
import { resolveScrapePlatform } from '../utils/resolve-scrape-platform.util';
import { noopScrapeTelemetry } from './log-scrape-telemetry';
import { parseBool } from '@/common/config/utils/parse-bool.util';
import type { ScrapeCacheRepository } from '../../domain/ports/scrape-cache.repository';
import type { DomainRateLimiter } from '../scraping/utils/domain-rate-limiter.util';
import { canonicalizeProductUrl } from '../../domain/utils/canonicalize-product-url.util';
import {
  createDefaultAcquisitionStrategies,
  runAcquisitionLadder,
} from '../scraping/acquisition/utils/run-acquisition-ladder.util';
import { PlaywrightStrategy } from '../scraping/acquisition/playwright.strategy';
import type { AcquisitionLadderContext } from '../scraping/acquisition/interfaces/acquisition-ladder-context.interface';
import { buildScrapeCacheKey } from '../scraping/acquisition/utils/scrape-cache-key.util';
import { persistScrapeCache } from '../scraping/acquisition/utils/persist-scrape-cache.util';
import type { FetchOutcome } from '../../domain/types/fetch-outcome.type';
import { metadataFieldSourcesForDiagnostics } from '../../domain/utils/metadata-field-sources.util';
import { resolvePartialScrapeResult } from './utils/resolve-partial-scrape-result.util';
import type { HttpFetchFn } from '../scraping/acquisition/types/http-fetch-fn.type';
import type { PlaywrightFetchFn } from '../scraping/acquisition/types/playwright-fetch-fn.type';
import { mapStrategyToSource } from './utils/map-strategy-to-source.util';
import { scrapingConfig } from '../scraping/utils/scraping-config.util';
import { SCRAPE_MIN_TIER_BUDGET_MS } from '../scraping/constants/scrape-budget.constant';
import { isBudgetExhausted, resolveDeadlineAt } from '../scraping/utils/scrape-deadline.util';
import {
  resolveHttpFetchTimeoutMs,
  resolvePlaywrightFetchTimeoutMs,
} from '../scraping/acquisition/utils/resolve-acquisition-timeout-ms.util';

export class MetadataScraperOrchestrator implements MetadataScraper {
  private readonly acquisitionStrategies;

  constructor(
    private readonly fetchHtml: HttpFetchFn = fetchPageHtml,
    private readonly browserFetch: PlaywrightFetchFn = playwrightFetchPage,
    private readonly telemetry: ScrapeTelemetry = noopScrapeTelemetry,
    private readonly scrapeCache?: ScrapeCacheRepository,
    private readonly domainRateLimiter?: DomainRateLimiter
  ) {
    this.acquisitionStrategies = createDefaultAcquisitionStrategies({
      fetchHtml: this.fetchHtml,
      browserFetch: this.browserFetch,
    });
  }

  async scrapeFromCapture(
    url: string,
    capture: ScrapeCaptureInput,
    mode: ScrapeMode = 'full',
    _options: MetadataScrapeOptions = {}
  ): Promise<ScrapeResult> {
    const finalUrl = resolveScrapeFinalUrl(null, url) ?? url;
    const extraction = extractMetadata({
      html: capture.html,
      url: finalUrl,
      mode,
      capturedJson: capture.capturedJson ?? [],
    });
    const validation = validateScrapeResult(extraction.metadata, capture.html, mode, {
      titleFromSlug: extraction.titleFromSlug,
      url: finalUrl,
    });

    if (validation.valid && extraction.confidence !== 'low') {
      return this.buildResult(extraction, 'fetch', validation, finalUrl, capture.html, 'ok');
    }

    const partial = resolvePartialScrapeResult({
      extraction,
      validation,
      source: 'fetch',
      finalUrl,
      html: capture.html,
    });
    if (partial) {
      return partial;
    }

    throw new ScrapeError(`Both strategies failed: ${validation.reason ?? 'capture-invalid'}`, {
      blocked: validation.blocked,
      validationReason: validation.reason,
      finalUrl,
      tier: 'fetch',
      outcome: validation.blocked ? 'blocked' : 'empty',
    });
  }

  async resolveFinalUrl(url: string): Promise<string | null> {
    try {
      const redirected = await resolveScrapeRedirectUrl(url, this.fetchHtml);
      return redirected.finalUrl;
    } catch {
      return resolveScrapeFinalUrl(null, url);
    }
  }

  async scrape(
    url: string,
    mode: ScrapeMode = 'full',
    options: MetadataScrapeOptions = {}
  ): Promise<ScrapeResult> {
    const startedAt = Date.now();
    const deadlineAt = resolveDeadlineAt(
      options.deadlineMs != null && options.deadlineMs > 0
        ? options.deadlineMs
        : scrapingConfig.totalBudgetMs,
      startedAt
    );
    const recordTelemetry = options.recordTelemetry !== false;
    let telemetryRecorded = false;
    let telemetryUrl = url;
    let telemetryHtml: string | undefined;
    let tier: ScrapeSource = 'fetch';
    let outcome: FetchOutcomeKind | 'error' = 'error';
    let fieldsFound: string[] = [];
    let confidence: ScrapeConfidence | undefined;
    let blockedReason: string | undefined;
    let cacheHit = false;
    const pipelineV2 = parseBool(process.env.SCRAPE_PIPELINE_V2, false);
    const cacheEnabled = pipelineV2 && this.scrapeCache != null;

    const emitTelemetry = () => {
      if (!recordTelemetry || telemetryRecorded) return;
      telemetryRecorded = true;
      this.telemetry.record(
        buildScrapeTelemetryEvent({
          url: telemetryUrl,
          platform: resolveScrapePlatform(telemetryUrl, telemetryHtml),
          tier,
          outcome,
          durationMs: Date.now() - startedAt,
          fieldsFound,
          confidence,
          blockedReason,
          cacheHit,
        })
      );
    };

    let lastReason: string | undefined;
    let lastBlocked = false;
    let effectiveUrl = url;
    const amazonTarget = isAmazonScrapeUrl(url);

    const markSuccess = (
      source: ScrapeSource,
      result: ScrapeResult,
      html: string,
      resultOutcome: FetchOutcomeKind = 'ok'
    ): ScrapeResult => {
      tier = source;
      outcome = resultOutcome;
      telemetryUrl = result.finalUrl ?? url;
      telemetryHtml = html;
      fieldsFound = result.diagnostics.fieldsFound ?? [];
      confidence = result.diagnostics.confidence;
      blockedReason = result.diagnostics.validationReason;
      return result;
    };

    try {
      if (amazonTarget) {
        const asinInInput = parseAmazonAsinFromUrl(url);
        if (asinInInput) {
          effectiveUrl = canonicalizeAmazonProductUrl(url);
        } else {
          try {
            const redirected = await resolveScrapeRedirectUrl(url, (target) =>
              this.fetchHtml(target, resolveHttpFetchTimeoutMs(deadlineAt))
            );
            const productTarget = resolveAmazonProductTargetUrl(
              redirected.finalUrl ?? '',
              redirected.html
            );
            if (productTarget) {
              effectiveUrl = productTarget;
            } else {
              effectiveUrl = url;
            }
          } catch {
            /* keep effectiveUrl */
          }
        }
      }

      if (!amazonTarget) {
        const ladderContext: AcquisitionLadderContext = {
          deadlineAt,
          refreshCache: options.refreshCache,
        };

        if (cacheEnabled && !options.refreshCache) {
          const cached = await this.scrapeCache!.get(buildScrapeCacheKey(url));
          if (cached?.html && cached.outcomeKind === 'ok') {
            cacheHit = true;
            const finalUrl = cached.finalUrl ?? canonicalizeProductUrl(url);
            const extraction = extractMetadata({
              html: cached.html,
              url: finalUrl,
              mode,
              capturedJson: cached.capturedJson,
            });
            const validation = validateScrapeResult(extraction.metadata, cached.html, mode, {
              titleFromSlug: extraction.titleFromSlug,
              url: finalUrl,
            });
            if (validation.valid && extraction.confidence !== 'low') {
              return markSuccess(
                mapStrategyToSource(cached.strategy ?? 'http-fetch'),
                this.buildResult(
                  extraction,
                  mapStrategyToSource(cached.strategy ?? 'http-fetch'),
                  validation,
                  finalUrl,
                  cached.html,
                  'ok'
                ),
                cached.html
              );
            }
          }
        }

        if (pipelineV2 && this.domainRateLimiter) {
          await this.domainRateLimiter.waitForSlot(url);
        }

        try {
          const fastOutcome = await runAcquisitionLadder(url, {
            strategies: this.acquisitionStrategies,
            onlyStrategyNames: ['platform-api', 'http-fetch'],
            context: ladderContext,
          });

          const handled = await this.applyNonAmazonAcquisitionOutcome({
            acquisition: fastOutcome,
            url,
            mode,
            markSuccess,
            cacheEnabled,
          });
          if (handled.kind === 'return') {
            return handled.result;
          }
          if (handled.kind === 'throw') {
            throw handled.error;
          }
          lastBlocked = handled.lastBlocked;
          lastReason = handled.lastReason;
        } catch (err) {
          if (err instanceof ScrapeError) {
            throw err;
          }
          const message = err instanceof Error ? err.message : String(err);
          if (
            /HTTP\s*403|HTTP\s*429|HTTP\s*401|HTTP\s*503/i.test(message) ||
            (err instanceof ScrapeFetchError &&
              (err.status === 401 ||
                err.status === 403 ||
                err.status === 429 ||
                err.status === 503))
          ) {
            lastBlocked = true;
          }
          lastReason = message;
        }
      }

      let shortLinkInput = false;
      try {
        shortLinkInput = isAmazonShortLinkHost(new URL(url).hostname);
      } catch {
        shortLinkInput = false;
      }

      const playwrightUrl = amazonTarget && shortLinkInput ? url : effectiveUrl;
      const postGateUrl =
        amazonTarget &&
        effectiveUrl !== playwrightUrl &&
        isAmazonProductPageUrl(effectiveUrl)
          ? effectiveUrl
          : undefined;

      const fallbackForErrors = shortLinkInput
        ? url
        : isAmazonProductPageUrl(effectiveUrl)
          ? effectiveUrl
          : url;

      tier = 'playwright';
      if (isBudgetExhausted(deadlineAt, SCRAPE_MIN_TIER_BUDGET_MS)) {
        throw new ScrapeError('Both strategies failed: scrape-budget-exhausted', {
          blocked: lastBlocked,
          validationReason: lastReason ?? 'scrape-budget-exhausted',
          finalUrl: fallbackForErrors !== url ? fallbackForErrors : undefined,
          tier: 'playwright',
          outcome: 'timeout',
        });
      }
      const { html, capturedJson, finalUrl: rawFinal } = await this.browserFetch(
        playwrightUrl,
        resolvePlaywrightFetchTimeoutMs(deadlineAt),
        { ...(postGateUrl ? { postGateUrl } : {}), deadlineAt }
      );
      const finalUrl = resolveScrapeFinalUrl(rawFinal, fallbackForErrors);
      if (!finalUrl) {
        throw new ScrapeError(`Both strategies failed: unsafe final URL after redirect`, {
          blocked: lastBlocked,
          validationReason: lastReason,
          finalUrl: fallbackForErrors !== url ? fallbackForErrors : undefined,
          tier: 'playwright',
        });
      }

      if (amazonTarget && !isAmazonProductPageUrl(finalUrl)) {
        throw new ScrapeError(`Both strategies failed: amazon-non-product-landing`, {
          blocked: true,
          validationReason: 'amazon-non-product-landing',
          finalUrl: fallbackForErrors,
          tier: 'playwright',
        });
      }

      const extraction = extractMetadata({ html, url: finalUrl, mode, capturedJson });
      const validation = validateScrapeResult(extraction.metadata, html, mode, {
        titleFromSlug: extraction.titleFromSlug,
        url: finalUrl,
      });

      if (!validation.valid || extraction.confidence === 'low') {
        const partial = resolvePartialScrapeResult({
          extraction,
          validation,
          source: 'playwright',
          finalUrl,
          html,
          blockedHint: validation.blocked ?? lastBlocked,
        });
        if (partial) {
          return markSuccess(
            'playwright',
            partial,
            html,
            partial.diagnostics.outcome ?? 'blocked'
          );
        }
        const failureOutcome =
          validation.blocked || lastBlocked ? ('blocked' as const) : ('empty' as const);
        throw new ScrapeError(`Both strategies failed: ${validation.reason ?? lastReason}`, {
          blocked: validation.blocked ?? lastBlocked,
          validationReason: validation.reason ?? lastReason,
          finalUrl:
            amazonTarget && !isAmazonProductPageUrl(finalUrl) ? fallbackForErrors : finalUrl,
          tier: 'playwright',
          outcome: failureOutcome,
        });
      }

      const successResult = markSuccess(
        'playwright',
        this.buildResult(extraction, 'playwright', validation, finalUrl, html, 'ok'),
        html
      );
      if (cacheEnabled && !amazonTarget && this.scrapeCache) {
        await persistScrapeCache(this.scrapeCache, url, {
          kind: 'ok',
          outcome: 'ok',
          strategy: 'playwright',
          status: 200,
          html,
          finalUrl,
          capturedJson,
        });
      }
      return successResult;
    } catch (err) {
      if (err instanceof ScrapeError) {
        tier = err.diagnostics?.tier ?? tier;
        blockedReason = err.diagnostics?.validationReason ?? blockedReason;
        outcome =
          err.diagnostics?.outcome ??
          (err.diagnostics?.blocked ? 'blocked' : outcome === 'error' ? 'error' : outcome);
        if (err.diagnostics?.finalUrl) {
          telemetryUrl = err.diagnostics.finalUrl;
        }
      } else {
        outcome = 'error';
        blockedReason = err instanceof Error ? err.message : String(err);
      }
      throw err;
    } finally {
      emitTelemetry();
    }
  }

  private async applyNonAmazonAcquisitionOutcome(params: {
    acquisition: FetchOutcome;
    url: string;
    mode: ScrapeMode;
    markSuccess: (
      source: ScrapeSource,
      result: ScrapeResult,
      html: string,
      resultOutcome?: FetchOutcomeKind
    ) => ScrapeResult;
    cacheEnabled: boolean;
  }): Promise<
    | { kind: 'return'; result: ScrapeResult }
    | { kind: 'throw'; error: ScrapeError }
    | { kind: 'continue'; lastBlocked: boolean; lastReason?: string }
  > {
    const { acquisition, url, mode, markSuccess, cacheEnabled } = params;

    if (acquisition.kind === 'terminal') {
      if (acquisition.outcome === 'not-found') {
        return {
          kind: 'throw',
          error: new ScrapeError(
            `Both strategies failed: not-found HTTP ${acquisition.status ?? ''}`.trim(),
            {
              blocked: false,
              validationReason: acquisition.status ? `http-${acquisition.status}` : 'not-found',
              finalUrl: acquisition.finalUrl,
              tier: 'fetch',
              outcome: 'not-found',
            }
          ),
        };
      }
      if (acquisition.outcome === 'unsafe-url') {
        return {
          kind: 'throw',
          error: new ScrapeError('Both strategies failed: unsafe final URL after redirect', {
            outcome: 'unsafe-url',
            validationReason: 'unsafe-url',
            tier: 'fetch',
          }),
        };
      }
    }

    if (acquisition.kind === 'escalate') {
      const blocked =
        acquisition.outcome === 'blocked' ||
        acquisition.outcome === 'login-wall' ||
        acquisition.outcome === 'geo-blocked';
      return {
        kind: 'continue',
        lastBlocked: blocked,
        lastReason: acquisition.message ?? acquisition.outcome,
      };
    }

    if (acquisition.kind !== 'ok') {
      return { kind: 'continue', lastBlocked: false, lastReason: 'acquisition-failed' };
    }

    const source = mapStrategyToSource(acquisition.strategy);
    const extraction = extractMetadata({
      html: acquisition.html,
      url: acquisition.finalUrl,
      mode,
      capturedJson: acquisition.capturedJson,
    });
    const validation = validateScrapeResult(extraction.metadata, acquisition.html, mode, {
      titleFromSlug: extraction.titleFromSlug,
      url: acquisition.finalUrl,
    });

    if (validation.valid && extraction.confidence !== 'low') {
      if (cacheEnabled && this.scrapeCache) {
        await persistScrapeCache(this.scrapeCache, url, acquisition);
      }
      return {
        kind: 'return',
        result: markSuccess(
          source,
          this.buildResult(
            extraction,
            source,
            validation,
            acquisition.finalUrl,
            acquisition.html,
            'ok'
          ),
          acquisition.html
        ),
      };
    }

    return {
      kind: 'continue',
      lastBlocked: validation.blocked ?? false,
      lastReason: validation.reason,
    };
  }

  private buildResult(
    extraction: ReturnType<typeof extractMetadata>,
    source: ScrapeSource,
    validation: ReturnType<typeof validateScrapeResult>,
    finalUrl: string,
    html: string,
    outcome: FetchOutcomeKind = 'ok'
  ): ScrapeResult {
    const websiteName = resolveWebsiteName(finalUrl, {
      ogSiteName: extractOgSiteName(html),
    });
    return {
      data: extraction.metadata,
      diagnostics: {
        source,
        confidence: validation.confidence ?? extraction.confidence,
        fieldsFound: validation.fieldsFound ?? extraction.fieldsFound,
        blocked: validation.blocked,
        validationReason: validation.reason,
        outcome,
        qualityGate: validation.qualityGate,
        fieldSources: metadataFieldSourcesForDiagnostics(extraction.metadata),
      },
      finalUrl,
      websiteName: websiteName || undefined,
      html,
    };
  }
}
