/**
 * Offline scrape corpus replay + scoring.
 *
 * Usage:
 *   bun run eval:scrape
 *   bun scripts/scrape-eval.ts [--baseline]
 *
 * Writes tmp/scrape-eval/report.json. With --baseline, diffs against
 * tests/fixtures/scraping/corpus/baseline.json and exits 1 on regression.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  diffScrapeEvalReports,
  runScrapeEval,
  type ScrapeEvalReport,
} from '../tests/support/scrape-eval';

const repoRoot = join(import.meta.dir, '..');
const corpusRoot = join(repoRoot, 'tests/fixtures/scraping/corpus');
const baselinePath = join(corpusRoot, 'baseline.json');
const reportPath = join(repoRoot, 'tmp/scrape-eval/report.json');

const compareBaseline = process.argv.includes('--baseline');

const report = runScrapeEval(corpusRoot);
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`Wrote ${reportPath} (${report.entryCount} entries)`);

if (!compareBaseline) {
  process.exit(0);
}

let baseline: ScrapeEvalReport;
try {
  baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as ScrapeEvalReport;
} catch (err) {
  console.error(`Missing or invalid baseline: ${baselinePath}`);
  console.error(err);
  process.exit(1);
}

const diff = diffScrapeEvalReports(baseline, report);
if (diff.equal) {
  console.log('Baseline diff: OK (no differences)');
  process.exit(0);
}

console.error(`Baseline diff: ${diff.differences.length} difference(s)`);
for (const row of diff.differences) {
  console.error(`  ${row.path}`);
  console.error(`    baseline: ${JSON.stringify(row.baseline)}`);
  console.error(`    report:   ${JSON.stringify(row.report)}`);
}
process.exit(1);
