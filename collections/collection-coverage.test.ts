import { describe, expect, test } from 'bun:test';
import {
  buildCollection,
  localEnvironment,
  validateCollectionSchema,
  validateEnvironment,
  validateVariableReferences,
} from './httpie-format.ts';
import { buildRequestDefsFromApp, loadOpenApiDocument } from './generate-httpie-collection.ts';
import { listOpenApiOperations } from './openapi-to-request-defs.ts';
import { overlayKey } from './public-routes.ts';
import { REQUEST_OVERLAY } from './request-overlay.ts';

describe('collection coverage from OpenAPI', () => {
  test('generated defs cover every OpenAPI HTTP operation', async () => {
    const doc = await loadOpenApiDocument();
    const ops = listOpenApiOperations(doc);
    const { defs, orphanOverlayKeys } = await buildRequestDefsFromApp();

    expect(orphanOverlayKeys).toEqual([]);
    expect(defs.length).toBe(ops.length);

    const defKeys = new Set(defs.map((d) => overlayKey(d.method, d.path)));
    for (const op of ops) {
      expect(defKeys.has(overlayKey(op.method, op.httpiePath))).toBe(true);
    }

    expect(defKeys.has(overlayKey('GET', '/api/auth/onboarding'))).toBe(true);
    expect(defKeys.has(overlayKey('PATCH', '/api/auth/onboarding'))).toBe(true);
    expect(defKeys.has(overlayKey('POST', '/api/auth/password'))).toBe(true);
    expect([...defKeys].some((k) => k.includes('/api/jobs/'))).toBe(true);

    expect(defKeys.has(overlayKey('POST', '/api/auth/verify-email'))).toBe(false);
    expect(defKeys.has(overlayKey('POST', '/api/auth/resend-verification'))).toBe(false);

    const collection = buildCollection('Giftistry', defs, { icon: { name: 'star', color: 'pink' } });
    const environment = localEnvironment();
    expect(validateCollectionSchema(collection)).toEqual([]);
    expect(validateEnvironment(environment)).toEqual([]);
    expect(validateVariableReferences(collection, environment)).toEqual([]);
  }, 60_000);
});
