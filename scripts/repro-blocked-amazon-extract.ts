/**
 * Reproduce blocked Amazon scrape + live AI populate (same config as running server).
 *
 * Usage:
 *   bun scripts/repro-blocked-amazon-extract.ts [url] [userId] [listId]
 *   bun scripts/repro-blocked-amazon-extract.ts --with-web-search [url] ...
 *
 * Without --with-web-search: expect a blocked ScrapeError (fail-closed; no hallucinated title).
 * With --with-web-search: expect a corroborated title when DDG research succeeds, else ScrapeError.
 * Set SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH (e.g. Nix chromium) when using --with-web-search.
 */
import { existsSync } from 'node:fs';
import { createInfrastructureAdapters } from '../src/boot/wire-adapters';
import { ExtractMetadataUseCase } from '../src/modules/item/slices/metadata/use-cases/extract-metadata.use-case';
import { ScrapeError } from '../src/modules/item/infrastructure/scraping/errors/scrape-error';

const args = process.argv.slice(2).filter((a) => a !== '--with-web-search');
const withWebSearch = process.argv.includes('--with-web-search');

const nixChromium = '/run/current-system/sw/bin/chromium';
if (!process.env.SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH && existsSync(nixChromium)) {
  process.env.SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH = nixChromium;
}

const url = args[0]?.trim() || 'https://www.amazon.com/dp/B0FHK6N2H4?th=1';
const userId = args[1]?.trim() || '2166cb8f-3ae6-4576-8993-3129c4e1ea46';
const listId = args[2]?.trim() || 'b713fe8e-bc7b-4588-b578-6785a7eab694';

const adapters = createInfrastructureAdapters();
const productResearcher = withWebSearch
  ? adapters.productResearcher
  : { research: async () => 'None' };

const useCase = new ExtractMetadataUseCase(
  {
    scrape: async () => {
      throw new ScrapeError('Both strategies failed: short-link-shell:amazon-gate', {
        blocked: true,
        validationReason: 'short-link-shell:amazon-gate',
        finalUrl: url,
        tier: 'playwright',
      });
    },
  } as never,
  adapters.metadataPopulator,
  adapters.categoryClassifier,
  adapters.userRepo,
  { execute: async () => undefined } as never,
  adapters.wishlistRepo,
  adapters.itemRepo,
  adapters.serverConfigRepo,
  adapters.pageContextFetcher,
  productResearcher
);

console.log('Simulating blocked Amazon scrape for:', url);
console.log('User:', userId, 'List:', listId);
console.log('Web search:', withWebSearch ? 'on' : 'off (use --with-web-search to enable)');
console.log(
  'Playwright executable:',
  process.env.SCRAPE_PLAYWRIGHT_EXECUTABLE_PATH ?? '(bundled — may fail on NixOS)'
);

try {
  const result = await useCase.execute(url, userId, { listId });
  console.log(
    JSON.stringify(
      {
        ok: true,
        title: result.data.title,
        price: result.data.price,
        category: result.data.category,
        imageUrl: result.data.imageUrl,
        description: result.data.description?.slice(0, 200) ?? null,
        predefinedFields: result.data.predefinedFields,
        userDefinedFields: result.data.userDefinedFields,
        diagnostics: result.diagnostics,
        finalUrl: result.finalUrl,
        pocketMicro: /pocket\s*micro/i.test(result.data.title),
      },
      null,
      2
    )
  );
} catch (err) {
  const e = err as { message?: string; diagnostics?: unknown };
  console.log(
    JSON.stringify(
      {
        ok: false,
        message: e.message,
        diagnostics: e.diagnostics ?? null,
      },
      null,
      2
    )
  );
  process.exit(1);
}
