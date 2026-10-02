import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertScrapeEvalThresholds,
  collectThresholdViolations,
  runScrapeEval,
  type ScrapeEvalThresholds,
} from './support/scrape-eval';

const corpusRoot = join(import.meta.dir, 'fixtures/scraping/corpus');
const thresholdsPath = join(corpusRoot, 'thresholds.json');

describe('scrape corpus replay', () => {
  test('meets thresholds.json field match rates', () => {
    const thresholds = JSON.parse(readFileSync(thresholdsPath, 'utf8')) as ScrapeEvalThresholds;
    const report = runScrapeEval(corpusRoot);
    expect(report.entryCount).toBeGreaterThan(0);
    const violations = collectThresholdViolations(report, thresholds);
    expect(violations).toEqual([]);
    assertScrapeEvalThresholds(report, thresholds);
  });

  test('blocked corpus entries report blocked validation', () => {
    const report = runScrapeEval(corpusRoot);
    const blocked = report.entries.filter((e) => e.blockedExpectationMet !== undefined);
    expect(blocked.length).toBeGreaterThan(0);
    for (const entry of blocked) {
      expect(entry.blockedExpectationMet).toBe(true);
      expect(entry.validation.blocked).toBe(true);
    }
  });
});
