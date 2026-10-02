export type { CorpusEntry } from './interfaces/corpus-entry.interface';
export type { CorpusEntryMeta } from './interfaces/corpus-entry-meta.interface';
export type { CorpusExpected } from './interfaces/corpus-expected.interface';
export type { ScrapeEvalReport } from './interfaces/scrape-eval-report.interface';
export type { ScrapeEvalThresholds } from './interfaces/scrape-eval-thresholds.interface';
export type { ScrapeEvalDiffResult } from './interfaces/scrape-eval-diff.interface';
export { TITLE_MATCH_MIN_SCORE, tokenSetSimilarity } from './matchers/token-set-similarity.util';
export { matchTitleField } from './matchers/match-title.util';
export { matchTitleCandidates } from './matchers/match-title-candidates.util';
export { matchPriceField } from './matchers/match-price.util';
export { matchImageUrlField } from './matchers/match-image-url.util';
export { matchImageHostField } from './matchers/match-image-host.util';
export { loadCorpusEntries } from './utils/load-corpus.util';
export { runScrapeEval } from './utils/run-scrape-eval.util';
export { diffScrapeEvalReports } from './utils/diff-scrape-eval-reports.util';
export {
  assertScrapeEvalThresholds,
  collectThresholdViolations,
  type ThresholdViolation,
} from './utils/assert-thresholds.util';
