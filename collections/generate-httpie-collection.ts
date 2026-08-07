/**
 * Regenerates HTTPie Desktop export files from the live Elysia OpenAPI spec.
 *
 * Outputs:
 *   - httpie-collection-giftistry.json  (collection, schema v1.0.0)
 *   - httpie-environment-local.json     (companion environment with variables)
 *
 * Run: bun run collections:generate
 *   or: NODE_ENV=test bun collections/generate-httpie-collection.ts
 *
 * @see https://schema.httpie.io/1.0.0.json
 * @see https://httpie.io/docs/desktop/export-json-format
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PGDATABASE ??= 'giftistry_test';

import {
  buildCollection,
  collectionMeta,
  environmentMeta,
  localEnvironment,
  validateCollectionSchema,
  validateEnvironment,
  validateVariableReferences,
} from './httpie-format.ts';
import { openApiToRequestDefs, type OpenApiDocument } from './openapi-to-request-defs.ts';
import { REQUEST_OVERLAY } from './request-overlay.ts';

const OUT_DIR = import.meta.dir;
const COLLECTION_OUT = `${OUT_DIR}/httpie-collection-giftistry.json`;
const ENVIRONMENT_OUT = `${OUT_DIR}/httpie-environment-local.json`;

export async function loadOpenApiDocument(): Promise<OpenApiDocument> {
  const { app } = await import('../src/index.ts');
  const res = await app.handle(new Request('http://localhost/docs/json'));
  if (!res.ok) {
    throw new Error(`Failed to load OpenAPI: HTTP ${res.status}`);
  }
  const doc = (await res.json()) as OpenApiDocument;
  if (!doc.openapi || !doc.paths || typeof doc.paths !== 'object') {
    throw new Error('OpenAPI document missing openapi/paths');
  }
  return doc;
}

export async function buildRequestDefsFromApp() {
  const doc = await loadOpenApiDocument();
  return openApiToRequestDefs(doc, REQUEST_OVERLAY);
}

async function main(): Promise<void> {
  const { defs, orphanOverlayKeys } = await buildRequestDefsFromApp();

  if (orphanOverlayKeys.length > 0) {
    console.error('Overlay keys missing from OpenAPI (remove or fix):');
    for (const key of orphanOverlayKeys) console.error(`  - ${key}`);
    process.exit(1);
  }

  const collection = buildCollection('Giftistry', defs, {
    icon: { name: 'star', color: 'pink' },
  });
  const environment = localEnvironment();

  const collectionErrors = validateCollectionSchema(collection);
  const environmentErrors = validateEnvironment(environment);
  const variableErrors = validateVariableReferences(collection, environment);

  if (collectionErrors.length > 0) {
    console.error('Collection validation failed:');
    for (const err of collectionErrors) console.error(`  - ${err}`);
    process.exit(1);
  }
  if (environmentErrors.length > 0) {
    console.error('Environment validation failed:');
    for (const err of environmentErrors) console.error(`  - ${err}`);
    process.exit(1);
  }
  if (variableErrors.length > 0) {
    console.error('Variable reference validation failed:');
    for (const err of variableErrors) console.error(`  - ${err}`);
    process.exit(1);
  }

  const collectionExport = { meta: collectionMeta(), entry: collection };
  const environmentExport = { meta: environmentMeta(), entry: environment };

  await Bun.write(COLLECTION_OUT, JSON.stringify(collectionExport, null, 2) + '\n');
  await Bun.write(ENVIRONMENT_OUT, JSON.stringify(environmentExport, null, 2) + '\n');

  console.log(`Wrote ${collection.requests.length} requests to ${COLLECTION_OUT}`);
  console.log(`Wrote ${environment.variables.length} variables to ${ENVIRONMENT_OUT}`);
  // Importing the app keeps DB pools open; exit explicitly after writing.
  process.exit(0);
}

if (import.meta.main) {
  await main();
}
