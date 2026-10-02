/**
 * Live scrape canary — hits real product URLs with the production orchestrator.
 *
 * Usage:
 *   bun run canary:scrape
 *   bun scripts/scrape-canary.ts [--fixture path/to/canary-urls.json]
 *
 * Exits 0 when scored pass rate >= minPassRate; otherwise exits 1.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MetadataScraperOrchestrator } from '../src/modules/item/infrastructure/adapters/metadata-scraper.orchestrator';
import { ScrapeError } from '../src/modules/item/domain/errors/scrape-error';

interface CanaryEntry {
  id: string;
  url: string;
  titleContains?: string;
  priceMin?: number;
  priceMax?: number;
  /** Negative test: scrape failure or failed assertions counts as pass. */
  expectFailure?: boolean;
}

interface CanaryFixture {
  minPassRate: number;
  concurrency?: number;
  timeoutMs?: number;
  entries: CanaryEntry[];
}

interface EntryOutcome {
  id: string;
  url: string;
  host: string;
  pass: boolean;
  reason: string;
  expectFailure: boolean;
  title?: string;
  price?: number | null;
}

const repoRoot = join(import.meta.dir, '..');
const fixtureArg = process.argv.find((a) => a.startsWith('--fixture='));
const fixturePath =
  fixtureArg?.slice('--fixture='.length) ??
  join(repoRoot, 'tests/fixtures/scraping/canary-urls.json');

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as CanaryFixture;
const concurrency = fixture.concurrency ?? 2;
const perUrlTimeoutMs = fixture.timeoutMs ?? 90_000;
const scraper = new MetadataScraperOrchestrator();

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '(invalid-url)';
  }
}

function assertEntry(entry: CanaryEntry, title: string | undefined, price: number | null): string | null {
  if (entry.titleContains) {
    const hay = (title ?? '').toLowerCase();
    const needle = entry.titleContains.toLowerCase();
    if (!hay.includes(needle)) {
      return `title missing substring "${entry.titleContains}" (got "${title ?? ''}")`;
    }
  }
  if (entry.priceMin != null && (price == null || price < entry.priceMin)) {
    return `price below min ${entry.priceMin} (got ${price ?? 'null'})`;
  }
  if (entry.priceMax != null && (price == null || price > entry.priceMax)) {
    return `price above max ${entry.priceMax} (got ${price ?? 'null'})`;
  }
  return null;
}

async function runEntry(entry: CanaryEntry): Promise<EntryOutcome> {
  const host = hostOf(entry.url);
  const expectFailure = entry.expectFailure === true;

  try {
    const result = await Promise.race([
      scraper.scrape(entry.url, 'full'),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`timeout after ${perUrlTimeoutMs}ms`)), perUrlTimeoutMs);
      }),
    ]);

    const title = result.data.title;
    const price = result.data.price;
    const assertionError = assertEntry(entry, title, price);

    if (expectFailure) {
      return {
        id: entry.id,
        url: entry.url,
        host,
        pass: false,
        reason: 'expected failure but scrape succeeded',
        expectFailure,
        title,
        price,
      };
    }

    if (assertionError) {
      return {
        id: entry.id,
        url: entry.url,
        host,
        pass: false,
        reason: assertionError,
        expectFailure,
        title,
        price,
      };
    }

    return {
      id: entry.id,
      url: entry.url,
      host,
      pass: true,
      reason: 'ok',
      expectFailure,
      title,
      price,
    };
  } catch (err) {
    const validationReason =
      err instanceof ScrapeError ? err.diagnostics?.validationReason : undefined;
    const message =
      err instanceof ScrapeError
        ? `${err.message}${validationReason ? ` (${validationReason})` : ''}`
        : err instanceof Error
          ? err.message
          : String(err);

    if (expectFailure) {
      return {
        id: entry.id,
        url: entry.url,
        host,
        pass: true,
        reason: `expected failure: ${message}`,
        expectFailure,
      };
    }

    return {
      id: entry.id,
      url: entry.url,
      host,
      pass: false,
      reason: message,
      expectFailure,
    };
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await fn(items[index]!);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

const outcomes = await mapPool(fixture.entries, concurrency, runEntry);

const scored = outcomes.filter((o) => !o.expectFailure);
const scoredPass = scored.filter((o) => o.pass).length;
const passRate = scored.length === 0 ? 1 : scoredPass / scored.length;

const byHost = new Map<string, EntryOutcome[]>();
for (const row of outcomes) {
  const list = byHost.get(row.host) ?? [];
  list.push(row);
  byHost.set(row.host, list);
}

console.log(`Scrape canary (${fixture.entries.length} URLs, concurrency ${concurrency})`);
console.log(`Scored pass rate: ${scoredPass}/${scored.length} (${(passRate * 100).toFixed(1)}%)`);
console.log(`Threshold: ${(fixture.minPassRate * 100).toFixed(1)}%\n`);

for (const [host, rows] of [...byHost.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`## ${host}`);
  for (const row of rows) {
    const mark = row.pass ? 'PASS' : 'FAIL';
    const tag = row.expectFailure ? ' [negative]' : '';
    console.log(`  ${mark}${tag} ${row.id}: ${row.reason}`);
    if (row.title) {
      console.log(`         title=${JSON.stringify(row.title)} price=${row.price ?? 'null'}`);
    }
  }
  console.log('');
}

if (passRate < fixture.minPassRate) {
  console.error(
    `Canary failed: pass rate ${(passRate * 100).toFixed(1)}% below min ${(fixture.minPassRate * 100).toFixed(1)}%`
  );
  process.exit(1);
}

console.log('Canary OK');
process.exit(0);
