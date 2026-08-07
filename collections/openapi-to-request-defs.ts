/**
 * Map OpenAPI 3 documents to HTTPie RequestDef entries.
 */

import {
  bodyJson,
  type HttpMethod,
  type RequestDef,
} from './httpie-format.ts';
import {
  exampleFromSchema,
  type JsonSchema,
  type OpenApiComponents,
} from './json-schema-example.ts';
import { isPublicRoute, openApiPathToHttpie, overlayKey } from './public-routes.ts';

const HTTP_METHODS = new Set<HttpMethod>(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  tags?: string[];
  security?: Array<Record<string, unknown>>;
  parameters?: Array<{
    in?: string;
    name?: string;
    required?: boolean;
    schema?: JsonSchema;
    example?: unknown;
  }>;
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: JsonSchema }>;
  };
}

export interface OpenApiDocument {
  openapi?: string;
  paths?: Record<string, Partial<Record<string, OpenApiOperation | unknown>>>;
  components?: OpenApiComponents;
}

export interface RequestOverlay {
  name?: string;
  group?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

function isOperation(value: unknown): value is OpenApiOperation {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function groupFromPath(path: string): string {
  if (path === '/health' || path.startsWith('/health/')) return 'Health';
  if (path.startsWith('/api/auth')) return 'Auth';
  if (path.startsWith('/api/system')) return 'System';
  if (path.startsWith('/api/admin')) return 'Admin';
  if (path.startsWith('/api/jobs') || path.includes('/jobs/')) return 'Jobs';
  if (path.startsWith('/api/wishlists') && path.includes('/items')) return 'Items';
  if (path.startsWith('/api/items')) return 'Items';
  if (path.startsWith('/api/wishlists') && path.includes('/comments')) return 'Comments';
  if (path.startsWith('/api/comments')) return 'Comments';
  if (path.startsWith('/api/wishlists') && path.includes('/shares')) return 'Shares';
  if (path.includes('/link-invites') || path.includes('/email-invites') || path.startsWith('/api/invites')) {
    return 'Invites';
  }
  if (path.startsWith('/api/wishlists') || path.startsWith('/api/priorities')) {
    return path.startsWith('/api/priorities') ? 'Priorities' : 'Wishlists';
  }
  if (path.startsWith('/api/friends') || path.startsWith('/api/users/search')) return 'Friends';
  if (path.startsWith('/api/notifications')) return 'Notifications';
  if (path.startsWith('/api/reports')) return 'Reports';
  if (path.startsWith('/api/themes') || path.startsWith('/api/users')) return 'Users & Themes';
  return 'API';
}

function humanizeOperationId(operationId: string): string {
  return operationId
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^post /i, '')
    .replace(/^get /i, '')
    .replace(/^put /i, '')
    .replace(/^patch /i, '')
    .replace(/^delete /i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function defaultName(method: HttpMethod, path: string, op: OpenApiOperation): string {
  if (op.summary?.trim()) return op.summary.trim();
  if (op.operationId?.trim()) return humanizeOperationId(op.operationId);
  const leaf = path.split('/').filter(Boolean).slice(-2).join(' ');
  return `${method} ${leaf || path}`;
}

function hasBearerSecurity(op: OpenApiOperation): boolean {
  if (!op.security || op.security.length === 0) return false;
  return op.security.some((entry) => Object.keys(entry).includes('bearerAuth'));
}

function needsAuth(method: HttpMethod, httpiePath: string, op: OpenApiOperation): boolean {
  if (isPublicRoute(method, httpiePath)) return false;
  if (hasBearerSecurity(op)) return true;
  // Default protected when OpenAPI omits security (jobs/system/admin often do).
  return true;
}

function jsonBodySchema(op: OpenApiOperation): JsonSchema | undefined {
  const content = op.requestBody?.content;
  if (!content) return undefined;
  return content['application/json']?.schema;
}

function queryFromParameters(op: OpenApiOperation): Record<string, string> | undefined {
  const queryParams = (op.parameters ?? []).filter((p) => p.in === 'query' && p.name);
  if (queryParams.length === 0) return undefined;
  const out: Record<string, string> = {};
  for (const param of queryParams) {
    const name = param.name!;
    if (param.example !== undefined) {
      out[name] = String(param.example);
      continue;
    }
    const synthesized = exampleFromSchema(param.schema);
    out[name] = synthesized === null || synthesized === undefined ? '' : String(synthesized);
  }
  return out;
}

export function listOpenApiOperations(
  doc: OpenApiDocument
): Array<{ method: HttpMethod; openApiPath: string; httpiePath: string; operation: OpenApiOperation }> {
  const out: Array<{
    method: HttpMethod;
    openApiPath: string;
    httpiePath: string;
    operation: OpenApiOperation;
  }> = [];

  for (const [openApiPath, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const [methodRaw, opRaw] of Object.entries(pathItem)) {
      const method = methodRaw.toUpperCase();
      if (!HTTP_METHODS.has(method as HttpMethod)) continue;
      if (!isOperation(opRaw)) continue;
      out.push({
        method: method as HttpMethod,
        openApiPath,
        httpiePath: openApiPathToHttpie(openApiPath),
        operation: opRaw,
      });
    }
  }

  out.sort((a, b) => {
    const byPath = a.httpiePath.localeCompare(b.httpiePath);
    if (byPath !== 0) return byPath;
    return a.method.localeCompare(b.method);
  });

  return out;
}

export function openApiToRequestDefs(
  doc: OpenApiDocument,
  overlay: Record<string, RequestOverlay> = {}
): { defs: RequestDef[]; orphanOverlayKeys: string[] } {
  const ops = listOpenApiOperations(doc);
  const seenKeys = new Set<string>();
  const defs: RequestDef[] = [];

  for (const { method, httpiePath, operation } of ops) {
    const key = overlayKey(method, httpiePath);
    seenKeys.add(key);
    const over = overlay[key];

    const schema = jsonBodySchema(operation);
    const synthesizedBody =
      schema !== undefined
        ? exampleFromSchema(schema, doc.components)
        : undefined;

    const bodyValue = over?.body !== undefined ? over.body : synthesizedBody;
    const query = over?.query ?? queryFromParameters(operation);

    const def: RequestDef = {
      group: over?.group ?? operation.tags?.[0] ?? groupFromPath(httpiePath),
      name: over?.name ?? defaultName(method, httpiePath, operation),
      method,
      path: httpiePath,
      auth: over?.auth ?? needsAuth(method, httpiePath, operation),
    };

    if (bodyValue !== undefined) {
      def.body = bodyJson(bodyValue);
    }
    if (query && Object.keys(query).length > 0) {
      def.query = query;
    }
    if (over?.headers) {
      def.headers = over.headers;
    }

    defs.push(def);
  }

  defs.sort((a, b) => {
    // Sort by HTTPie display name ("Group: Name") so the export reads A–Z in Desktop.
    const byLabel = `${a.group}: ${a.name}`.localeCompare(`${b.group}: ${b.name}`, undefined, {
      sensitivity: 'base',
    });
    if (byLabel !== 0) return byLabel;
    const byPath = a.path.localeCompare(b.path);
    if (byPath !== 0) return byPath;
    return a.method.localeCompare(b.method);
  });

  const orphanOverlayKeys = Object.keys(overlay).filter((k) => !seenKeys.has(k)).sort();
  return { defs, orphanOverlayKeys };
}
