import type { AiMetadataExtractionOptions } from '@/modules/system';
import type { ExtractedMetadata } from '../../../domain/interfaces/extracted-metadata.interface';
import type { ScrapeResult } from '../../../domain/interfaces/scrape-result.interface';
import { buildAiEvidence } from '../../../domain/utils/build-ai-evidence.util';
import {
  formatScrapeFactsForAi,
  shouldAttachScrapeFacts,
} from '../../../domain/utils/format-scrape-facts-for-ai.util';
import { buildBlockedPageContext } from './blocked-scrape-fallback.util';

function prependScrapeFactsIfNeeded(
  pageContext: string,
  scrapeResult: ScrapeResult,
  scrapeWithFields: ExtractedMetadata
): string {
  if (
    !shouldAttachScrapeFacts(scrapeResult, scrapeWithFields) ||
    pageContext.includes('Scraped facts')
  ) {
    return pageContext;
  }
  const facts = formatScrapeFactsForAi(scrapeWithFields);
  if (!facts) {
    return pageContext;
  }
  return `${facts}\n\n${pageContext}`;
}

export async function resolveExtractPageContext(options: {
  isBlocked: boolean;
  resolvedUrl: string;
  pageHtml: string | undefined;
  scrapeWithFields: ExtractedMetadata;
  scrapeResult: ScrapeResult;
  extraction: AiMetadataExtractionOptions;
  fetchContext: (url: string) => Promise<string>;
}): Promise<string> {
  const {
    isBlocked,
    resolvedUrl,
    pageHtml,
    scrapeWithFields,
    scrapeResult,
    extraction,
    fetchContext,
  } = options;

  if (isBlocked) {
    return prependScrapeFactsIfNeeded(
      buildBlockedPageContext(resolvedUrl),
      scrapeResult,
      scrapeWithFields
    );
  }

  if (pageHtml?.trim()) {
    return prependScrapeFactsIfNeeded(
      buildAiEvidence({
        html: pageHtml,
        url: resolvedUrl,
        scrape: scrapeWithFields,
        extraction,
      }),
      scrapeResult,
      scrapeWithFields
    );
  }

  const fetched = await fetchContext(resolvedUrl);
  return prependScrapeFactsIfNeeded(fetched, scrapeResult, scrapeWithFields);
}
