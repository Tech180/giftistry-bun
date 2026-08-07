import { describe, expect, test } from 'bun:test';
import {
  listOpenApiOperations,
  openApiToRequestDefs,
  type OpenApiDocument,
} from './openapi-to-request-defs.ts';
import { overlayKey } from './public-routes.ts';

const fixture: OpenApiDocument = {
  openapi: '3.0.3',
  paths: {
    '/health': {
      get: {
        operationId: 'getHealth',
        summary: 'Health Check',
        tags: ['Health'],
      },
    },
    '/api/auth/login': {
      post: {
        operationId: 'postApiAuthLogin',
        summary: 'Authenticate a user',
        tags: ['Authentication'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['Giftistry'],
                properties: {
                  Giftistry: {
                    type: 'object',
                    required: ['Auth'],
                    properties: {
                      Auth: {
                        type: 'object',
                        required: ['Username', 'Password'],
                        properties: {
                          Username: { type: 'string' },
                          Password: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/wishlists/{listId}': {
      get: {
        operationId: 'getApiWishlistsByListId',
        tags: ['Wishlists'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'listId', required: true, schema: { type: 'string' } },
        ],
      },
    },
    '/api/jobs/{jobId}': {
      get: {
        operationId: 'getApiJobsByJobId',
        parameters: [
          { in: 'path', name: 'jobId', required: true, schema: { type: 'string' } },
        ],
      },
    },
  },
};

describe('openapi-to-request-defs', () => {
  test('lists HTTP operations and converts path params', () => {
    const ops = listOpenApiOperations(fixture);
    expect(ops.map((o) => `${o.method} ${o.httpiePath}`)).toEqual([
      'POST /api/auth/login',
      'GET /api/jobs/<jobId>',
      'GET /api/wishlists/<listId>',
      'GET /health',
    ]);
  });

  test('marks public login as unauthenticated and synthesizes body', () => {
    const { defs } = openApiToRequestDefs(fixture);
    const login = defs.find((d) => d.path === '/api/auth/login' && d.method === 'POST');
    expect(login).toBeDefined();
    expect(login?.auth).toBe(false);
    expect(login?.body?.type).toBe('text');
    expect(login?.body?.text?.value).toContain('"Username"');
  });

  test('defaults jobs without security to authenticated', () => {
    const { defs } = openApiToRequestDefs(fixture);
    const job = defs.find((d) => d.path === '/api/jobs/<jobId>');
    expect(job?.auth).toBe(true);
    expect(job?.group).toBe('Jobs');
  });

  test('applies overlay and reports orphans', () => {
    const { defs, orphanOverlayKeys } = openApiToRequestDefs(fixture, {
      [overlayKey('POST', '/api/auth/login')]: {
        name: 'Login',
        body: { Giftistry: { Auth: { Username: 'user', Password: 'pass' } } },
      },
      [overlayKey('POST', '/api/auth/verify-email')]: {
        name: 'Stale',
      },
    });
    const login = defs.find((d) => d.method === 'POST' && d.path === '/api/auth/login');
    expect(login?.name).toBe('Login');
    expect(login?.body?.text?.value).toContain('"user"');
    expect(orphanOverlayKeys).toEqual([overlayKey('POST', '/api/auth/verify-email')]);
  });

  test('sorts defs alphabetically by display label', () => {
    const { defs } = openApiToRequestDefs(fixture, {
      [overlayKey('POST', '/api/auth/login')]: { name: 'Zebra Login', group: 'Auth' },
      [overlayKey('GET', '/health')]: { name: 'Alpha Health', group: 'Auth' },
      [overlayKey('GET', '/api/jobs/<jobId>')]: { name: 'Get job', group: 'Users' },
      [overlayKey('GET', '/api/wishlists/<listId>')]: {
        name: 'Theme CSS',
        group: 'Users & Themes',
      },
    });
    expect(defs.map((d) => `${d.group}: ${d.name}`)).toEqual([
      'Auth: Alpha Health',
      'Auth: Zebra Login',
      'Users & Themes: Theme CSS',
      'Users: Get job',
    ]);
  });
});
