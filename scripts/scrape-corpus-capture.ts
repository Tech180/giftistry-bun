#!/usr/bin/env bun
/**
 * Capture a live page into tests/fixtures/scraping/corpus/<slug>/.
 *
 * Usage:
 *   bun scripts/scrape-corpus-capture.ts --url https://example.com/product --platform generic --tag manual
 *   bun scripts/scrape-corpus-capture.ts --url https://www.amazon.com/dp/B0TEST --platform amazon --tag live --playwright
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { safeFetch } from '../src/modules/item/infrastructure/scraping/utils/safe-fetch.util';
import { playwrightFetchPage } from '../src/modules/item/infrastructure/scraping/utils/playwright-fetch-page.util';
import { trimFixtureHtml } from './lib/trim-fixture-html.util';

const CORPUS_ROOT = join(import.meta.dir, '../tests/fixtures/scraping/corpus');

function parseFlag(args: string[], name: string): string | undefined {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) {
    return eq.slice(name.length + 1);
  }
  const idx = args.indexOf(name);
  if (idx !== -1 && idx + 1 < args.length && !args[idx + 1]!.startsWith('--')) {
    return args[idx + 1];
  }
  return undefined;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name) || args.some((a) => a.startsWith(`${name}=`));
}

function slugFromUrl(url: string): string {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, '').replace(/\./g, '-');
  const pathPart = parsed.pathname.replace(/^\//, '').replace(/\//g, '-').slice(0, 48);
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 8);
  const base = [host, pathPart].filter(Boolean).join('-').replace(/[^a-zA-Z0-9-]+/g, '-');
  return `${base}-${hash}`.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `capture-${hash}`;
}

/** Best-effort redaction before committing HTML to the repo. */
function stripScrapeCapturePii(html: string): string {
  let out = html;
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, 'redacted@example.com');
  out = out.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '203.0.113.0');
  out = out.replace(
    /\b(?:session|sessionid|phpsessid|jsessionid|auth|token|csrf)[^=]*=\s*[A-Za-z0-9._-]{8,}\b/gi,
    'token=redacted'
  );
  out = out.replace(/Set-Cookie:\s*[^\n]+/gi, 'Set-Cookie: redacted');
  return out;
}

const USAGE = `Capture a scraping corpus snapshot (internal tests only).

Required:
  --url <https://...>
  --platform <shopify|amazon|generic|...>

Optional:
  --tag <label>       Extra tag (repeatable); also pass multiple --tag flags
  --slug <name>       Override corpus folder name
  --playwright        Fetch rendered HTML via Playwright instead of safeFetch
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
    console.log(USAGE);
    process.exit(0);
  }

  const url = parseFlag(args, '--url')?.trim();
  const platform = parseFlag(args, '--platform')?.trim();
  if (!url || !platform) {
    console.error(USAGE);
    process.exit(1);
  }

  const tags = args
    .flatMap((a, i) => {
      if (a === '--tag' && args[i + 1]) {
        return [args[i + 1]!];
      }
      if (a.startsWith('--tag=')) {
        return [a.slice('--tag='.length)];
      }
      return [];
    })
    .filter(Boolean);

  const slug = parseFlag(args, '--slug')?.trim() || slugFromUrl(url);
  const usePlaywright = hasFlag(args, '--playwright');
  const tier = usePlaywright ? 'playwright' : 'http';

  let status: number;
  let finalUrl: string;
  let rawHtml: string;

  if (usePlaywright) {
    const result = await playwrightFetchPage(url);
    status = result.status ?? 200;
    finalUrl = result.finalUrl ?? url;
    rawHtml = result.html;
  } else {
    const result = await safeFetch(url, { enforceHtmlContentType: false });
    status = result.status;
    finalUrl = result.finalUrl;
    rawHtml = result.body;
  }

  const redacted = stripScrapeCapturePii(rawHtml);
  const pageHtml = trimFixtureHtml(redacted);

  const entryDir = join(CORPUS_ROOT, slug);
  mkdirSync(entryDir, { recursive: true });

  const fetchedAt = new Date().toISOString();
  const meta = {
    url,
    finalUrl,
    status,
    fetchedAt,
    tier,
    platform,
    tags: ['captured', ...tags],
  };

  const expected = {
    pageType: 'unknown',
    title: [] as string[],
    price: null as number | null,
    currency: null as string | null,
    imageHost: null as string | null,
    availability: null as string | null,
    shouldBeBlocked: null as boolean | null,
  };

  writeFileSync(join(entryDir, 'page.html'), pageHtml, 'utf8');
  writeFileSync(join(entryDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  writeFileSync(join(entryDir, 'expected.json'), `${JSON.stringify(expected, null, 2)}\n`, 'utf8');

  console.log(`Wrote corpus entry: ${entryDir}`);
  console.log(`  status=${status} tier=${tier} bytes=${Buffer.byteLength(pageHtml, 'utf8')}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
