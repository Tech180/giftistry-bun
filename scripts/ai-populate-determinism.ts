#!/usr/bin/env bun
/**
 * Opt-in live harness: run the configured **fast** AI slot N times over a small
 * fixed populate corpus and report per-field agreement rates.
 *
 * Requires a reachable fast AI provider (same config as the running server).
 *
 * Usage:
 *   bun scripts/ai-populate-determinism.ts
 *   bun scripts/ai-populate-determinism.ts --runs 5
 *   bun scripts/ai-populate-determinism.ts --runs 3 --json
 *
 * Exit 0 when all tracked fields reach 100% agreement across runs; otherwise 1.
 */
import { createInfrastructureAdapters } from '../src/boot/wire-adapters';
import { resolveAiConnection } from '../src/common/utils/resolve-ai-connection.util';
import { probeAiReachability } from '../src/common/utils/probe-ai-reachability.util';
import { resolveAiMetadataExtractionOptions } from '../src/modules/system';
import { runMetadataPopulateStrategy } from '../src/modules/item/infrastructure/utils/run-metadata-populate-strategy.util';
import type { MetadataPopulatorInput } from '../src/modules/item/domain/interfaces/metadata-populator-input.interface';
import type { ExtractedMetadata } from '../src/modules/item/domain/interfaces/extracted-metadata.interface';

const CORPUS: MetadataPopulatorInput[] = [
  {
    url: 'https://shop.example/cpu/5600x',
    websiteName: 'Example Shop',
    pageContext: 'Product Name: AMD Ryzen 5 5600X\nBrand: AMD\nCores: 6',
    itemName: 'AMD Ryzen 5 5600X',
    category: 'tech',
    searchContext: 'None',
  },
  {
    url: 'https://shop.example/mug/classic',
    websiteName: 'Example Shop',
    pageContext: 'Product Name: Classic Mug\nMaterial: Ceramic\nCapacity: 12 oz',
    itemName: 'Classic Mug',
    category: 'home',
    searchContext: 'None',
  },
];

function parseRunsArg(argv: string[]): number {
  const eq = argv.find((a) => a.startsWith('--runs='));
  if (eq) {
    return Math.max(1, Number.parseInt(eq.slice('--runs='.length), 10) || 1);
  }
  const idx = argv.indexOf('--runs');
  if (idx !== -1 && argv[idx + 1]) {
    return Math.max(1, Number.parseInt(argv[idx + 1]!, 10) || 1);
  }
  return 3;
}

function fieldSnapshot(data: ExtractedMetadata): Record<string, string> {
  return {
    title: (data.title ?? '').trim(),
    price: data.price != null ? String(data.price) : '',
    description: (data.description ?? '').trim(),
    color: (data.color ?? '').trim(),
    size: (data.size ?? '').trim(),
    category: (data.category ?? '').trim(),
    imageUrl: (data.imageUrl ?? '').trim(),
  };
}

function agreementRate(values: string[]): number {
  if (values.length === 0) return 1;
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const max = Math.max(...counts.values());
  return max / values.length;
}

const argv = process.argv.slice(2);
const runs = parseRunsArg(argv);
const jsonOut = argv.includes('--json');

const adapters = createInfrastructureAdapters();
const config = adapters.serverConfigRepo.load();
const fast = resolveAiConnection(config, 'fast');
const reachable = await probeAiReachability(fast);

if (!reachable) {
  console.error('Fast AI provider unreachable; configure AiFast* in config.json');
  process.exit(1);
}

const extraction = resolveAiMetadataExtractionOptions(config);
const populatorConfig = {
  provider: fast.provider,
  apiKey: fast.apiKey,
  model: fast.model,
  endpoint: fast.endpoint,
  customPrompt: config.AiPopulatePrompt || '',
  linkedDescriptionPrompt: config.AiDescriptionPrompt || '',
  linkedCategoryPrompt: config.AiCategoryPrompt || '',
  extractionOptions: extraction,
};

type RowReport = {
  corpusIndex: number;
  fields: Record<string, { agreement: number; distinct: number }>;
};

const report: RowReport[] = [];

for (let c = 0; c < CORPUS.length; c += 1) {
  const input = CORPUS[c]!;
  const byField = new Map<string, string[]>();
  for (let r = 0; r < runs; r += 1) {
    const data = await runMetadataPopulateStrategy(input, populatorConfig);
    const snap = fieldSnapshot(data);
    for (const [field, value] of Object.entries(snap)) {
      const list = byField.get(field) ?? [];
      list.push(value);
      byField.set(field, list);
    }
  }

  const fields: RowReport['fields'] = {};
  for (const [field, values] of byField.entries()) {
    const distinct = new Set(values).size;
    fields[field] = { agreement: agreementRate(values), distinct };
  }
  report.push({ corpusIndex: c, fields });
}

let allPerfect = true;
for (const row of report) {
  for (const stats of Object.values(row.fields)) {
    if (stats.agreement < 1) {
      allPerfect = false;
    }
  }
}

if (jsonOut) {
  console.log(JSON.stringify({ runs, corpusSize: CORPUS.length, report, allPerfect }, null, 2));
} else {
  console.log(`AI populate determinism (${runs} run(s), ${CORPUS.length} corpus row(s))`);
  for (const row of report) {
    console.log(`\nCorpus #${row.corpusIndex} (${CORPUS[row.corpusIndex]?.itemName})`);
    for (const [field, stats] of Object.entries(row.fields)) {
      const pct = (stats.agreement * 100).toFixed(1);
      console.log(`  ${field}: ${pct}% agreement (${stats.distinct} distinct)`);
    }
  }
  console.log(allPerfect ? '\nAll fields agreed across runs.' : '\nSome fields diverged across runs.');
}

process.exit(allPerfect ? 0 : 1);
