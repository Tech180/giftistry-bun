import { describe, expect, test } from 'bun:test';
import {
  authBearer,
  bodyJson,
  bodyNone,
  buildCollection,
  buildRequest,
  collectVariableReferences,
  localEnvironment,
  parsePathParams,
  validateCollectionSchema,
  validateEnvironment,
  validateVariableReferences,
  type RequestDef,
} from './httpie-format.ts';

describe('HTTPie format helpers', () => {
  test('parsePathParams converts angle brackets to /:param syntax', () => {
    const { path, pathParams } = parsePathParams('/api/wishlists/<listId>/items/<itemId>');
    expect(path).toBe('/api/wishlists/:listId/items/:itemId');
    expect(pathParams).toEqual([
      { name: 'listId', value: '', enabled: true },
      { name: 'itemId', value: '', enabled: true },
    ]);
  });

  test('buildRequest uses inherited auth and full body document for JSON', () => {
    const def: RequestDef = {
      group: 'Items',
      name: 'Add Item',
      method: 'POST',
      path: '/api/wishlists/<listId>/items',
      auth: true,
      body: bodyJson({ hello: 'world' }),
    };
    const req = buildRequest('{{environment}}', def);
    expect(req.name).toBe('Items: Add Item');
    expect(req.url).toBe('{{environment}}/api/wishlists/:listId/items');
    expect(req.auth).toEqual({ type: 'inherited' });
    expect(req.body.type).toBe('text');
    expect(req.body.text?.format).toBe('application/json');
    expect(req.body.form).toBeDefined();
    expect(req.body.graphql).toBeDefined();
    expect(req.body.file).toBeDefined();
  });

  test('buildRequest uses auth none for public endpoints', () => {
    const req = buildRequest('http://localhost:3001', {
      group: 'Health',
      name: 'Health Check',
      method: 'GET',
      path: '/health',
    });
    expect(req.auth).toEqual({ type: 'none' });
    expect(req.body).toEqual(bodyNone());
  });

  test('buildCollection sets collection-level bearer auth', () => {
    const collection = buildCollection('Test', [], { bearerToken: '<token>' });
    expect(collection.auth).toEqual(authBearer('<token>'));
  });

  test('validateCollectionSchema rejects invalid icon names', () => {
    const collection = buildCollection('Test', [], {
      icon: { name: 'gift' as 'star', color: 'pink' },
    });
    const errors = validateCollectionSchema(collection);
    expect(errors.some((e) => e.includes('IconName'))).toBe(true);
  });

  test('validateVariableReferences requires environment definitions', () => {
    const collection = buildCollection('Test', [
      {
        group: 'Health',
        name: 'Check',
        method: 'GET',
        path: '/health',
      },
    ]);
    const env = localEnvironment();
    expect(validateVariableReferences(collection, env)).toEqual([]);
    expect(collectVariableReferences(collection).has('environment')).toBe(true);
  });

  test('validateCollectionSchema rejects invalid urls and missing fields', () => {
    const errors = validateCollectionSchema({
      name: 'Bad',
      auth: authBearer('x'),
      requests: [
        {
          name: 'Broken',
          url: 'http://localhost/<id>',
          method: 'GET',
          headers: [],
          queryParams: [],
          pathParams: [],
          auth: { type: 'inherited' },
          body: { type: 'none' },
        },
      ],
    });
    expect(errors.some((e) => e.includes('/:param'))).toBe(true);
  });

  test('validateEnvironment requires variable metadata', () => {
    const errors = validateEnvironment(localEnvironment());
    expect(errors).toEqual([]);
  });
});
