import { extractMetadata } from '../../../../src/modules/item/infrastructure/scraping/extractors/extraction-pipeline';
import { validateScrapeResult } from '../../../../src/modules/item/infrastructure/scraping/utils/validate-scrape-result.util';
import type { ScrapeEvalReport } from '../interfaces/scrape-eval-report.interface';
import { aggregateFieldScores } from './aggregate-field-scores.util';
import { loadCorpusEntries } from './load-corpus.util';
import { scoreCorpusEntry } from './score-corpus-entry.util';

const MIN_HTML_CHARS = 600;

function padHtmlForValidation(html: string): string {
  return html.length >= MIN_HTML_CHARS ? html : html.padEnd(MIN_HTML_CHARS, ' ');
}

export function runScrapeEval(corpusRoot: string): ScrapeEvalReport {
  const corpusEntries = loadCorpusEntries(corpusRoot);
  const replayed = corpusEntries.map((entry) => {
    const html = padHtmlForValidation(entry.html);
    const extraction = extractMetadata({ html, url: entry.meta.url, mode: 'full' });
    const validation = validateScrapeResult(extraction.metadata, html, 'full', {
      url: entry.meta.url,
    });
    return scoreCorpusEntry(entry, extraction.metadata, validation);
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    corpusRoot,
    entryCount: replayed.length,
    aggregates: aggregateFieldScores(replayed),
    entries: replayed,
  };
}
