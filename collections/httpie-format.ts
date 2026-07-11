/**
 * Helpers aligned with HTTPie Desktop export format v1.0.0.
 * @see https://schema.httpie.io/1.0.0.json
 * @see https://httpie.io/docs/desktop/export-json-format
 */

export const HTTPIE_SCHEMA_URL = 'https://schema.httpie.io/1.0.0.json';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type AuthType = 'none' | 'basic' | 'bearer' | 'apiKey' | 'inherited';
export type AuthTypeWithoutInherited = Exclude<AuthType, 'inherited'>;
export type RequestBodyType = 'none' | 'text' | 'form' | 'graphql' | 'file';
export type RequestMimeType = 'text/plain' | 'application/json' | 'application/xml' | 'text/yaml';
export type Color =
  | 'gray'
  | 'green'
  | 'pink'
  | 'blue'
  | 'red'
  | 'orange'
  | 'purple'
  | 'aqua'
  | 'yellow';

/** @see https://schema.httpie.io/1.0.0.json#/definitions/IconName */
export type IconName =
  | 'default'
  | 'circle'
  | 'triangle'
  | 'square'
  | 'rhombus'
  | 'hexagon'
  | 'heart'
  | 'star'
  | 'thumbUp'
  | 'rocket'
  | 'cloud'
  | 'bulb'
  | 'diamond'
  | 'lock'
  | 'wrench'
  | 'hammer'
  | 'flame'
  | 'monitor'
  | 'mobile'
  | 'globe'
  | 'database'
  | 'creditCard'
  | 'paperPencil'
  | 'bubble';

export const ICON_NAMES: readonly IconName[] = [
  'default',
  'circle',
  'triangle',
  'square',
  'rhombus',
  'hexagon',
  'heart',
  'star',
  'thumbUp',
  'rocket',
  'cloud',
  'bulb',
  'diamond',
  'lock',
  'wrench',
  'hammer',
  'flame',
  'monitor',
  'mobile',
  'globe',
  'database',
  'creditCard',
  'paperPencil',
  'bubble',
];

export const COLORS: readonly Color[] = [
  'gray',
  'green',
  'pink',
  'blue',
  'red',
  'orange',
  'purple',
  'aqua',
  'yellow',
];

const AUTH_TYPES_WITHOUT_INHERITED: readonly AuthTypeWithoutInherited[] = [
  'none',
  'basic',
  'bearer',
  'apiKey',
];

const AUTH_TYPES_WITH_INHERITED: readonly AuthType[] = [
  ...AUTH_TYPES_WITHOUT_INHERITED,
  'inherited',
];

const REQUEST_BODY_TYPES: readonly RequestBodyType[] = [
  'none',
  'text',
  'form',
  'graphql',
  'file',
];

const REQUEST_MIME_TYPES: readonly RequestMimeType[] = [
  'text/plain',
  'application/json',
  'application/xml',
  'text/yaml',
];

export interface ListItem {
  name: string;
  value: string;
  enabled: boolean;
}

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface Auth {
  type: AuthTypeWithoutInherited;
  credentials?: AuthCredentials;
  target?: 'headers' | 'params';
}

export interface AuthWithInherited {
  type: AuthType;
  credentials?: AuthCredentials;
  target?: 'headers' | 'params';
}

/** HTTPie stores inactive body types in the same document as the active one. */
export interface RequestBody {
  type: RequestBodyType;
  text?: { format: RequestMimeType; value: string };
  form?: {
    isMultipart: boolean;
    fields: Array<{
      enabled: boolean;
      name: string;
      type: 'text' | 'file' | 'filetext';
      value?: string;
      file?: { name: string };
    }>;
  };
  graphql?: { query: string; variables: string };
  file?: { name: string };
}

export interface HttpieRequest {
  name: string;
  url: string;
  method: string;
  headers: ListItem[];
  queryParams: ListItem[];
  pathParams: ListItem[];
  auth: AuthWithInherited;
  body: RequestBody;
  id?: string;
}

export interface HttpieCollection {
  name: string;
  auth: Auth;
  icon?: { name: IconName; color: Color };
  requests: HttpieRequest[];
  id?: string;
}

export interface HttpieEnvironment {
  name: string;
  isDefault: boolean;
  isLocalOnly: boolean;
  variables: Array<{ name: string; value: string; isSecret: boolean; id?: string }>;
  color?: Color;
  id?: string;
}

export interface HttpieMeta {
  format: 'httpie';
  version: string;
  contentType: 'workspace' | 'collection' | 'request' | 'environment';
  schema?: string;
  docs?: string;
  source?: string;
}

const EMPTY_BODY_DOCUMENT: Omit<RequestBody, 'type'> = {
  text: { format: 'application/json', value: '' },
  form: { isMultipart: false, fields: [] },
  graphql: { query: '', variables: '' },
  file: { name: '' },
};

export function listItem(name: string, value: string, enabled = true): ListItem {
  return { name, value, enabled };
}

export function authNone(): AuthWithInherited {
  return { type: 'none' };
}

export function authInherited(): AuthWithInherited {
  return { type: 'inherited' };
}

export function authBearer(token: string): Auth {
  return {
    type: 'bearer',
    credentials: { username: '', password: token },
  };
}

export function bodyNone(): RequestBody {
  return { type: 'none', ...EMPTY_BODY_DOCUMENT };
}

export function bodyJson(value: unknown, format: RequestMimeType = 'application/json'): RequestBody {
  return {
    type: 'text',
    text: {
      format,
      value: JSON.stringify(value, null, 2),
    },
    form: { isMultipart: false, fields: [] },
    graphql: { query: '', variables: '' },
    file: { name: '' },
  };
}

export function bodyForm(
  fields: Array<{ name: string; value: string; enabled?: boolean }>,
  isMultipart = false
): RequestBody {
  return {
    type: 'form',
    form: {
      isMultipart,
      fields: fields.map((f) => ({
        enabled: f.enabled ?? true,
        name: f.name,
        type: 'text' as const,
        value: f.value,
      })),
    },
    text: { format: 'application/json', value: '' },
    graphql: { query: '', variables: '' },
    file: { name: '' },
  };
}

export function bodyGraphql(query: string, variables = '{}'): RequestBody {
  return {
    type: 'graphql',
    graphql: { query, variables },
    text: { format: 'application/json', value: '' },
    form: { isMultipart: false, fields: [] },
    file: { name: '' },
  };
}

export function bodyPlainText(value: string, format: RequestMimeType = 'text/plain'): RequestBody {
  return {
    type: 'text',
    text: { format, value },
    form: { isMultipart: false, fields: [] },
    graphql: { query: '', variables: '' },
    file: { name: '' },
  };
}

/**
 * Converts `<param>` placeholders to HTTPie `/:param` URL segments and
 * populates the pathParams table (required by HTTPie Desktop).
 */
export function parsePathParams(path: string): { path: string; pathParams: ListItem[] } {
  const pathParams: ListItem[] = [];
  const parsed = path.replace(/\/<([^>]+)>/g, (_match, name: string) => {
    pathParams.push(listItem(name, ''));
    return `/:${name}`;
  });
  return { path: parsed, pathParams };
}

export interface RequestDef {
  /** Breadcrumb prefix, e.g. "Auth". Flattened into request name per HTTPie import rules. */
  group: string;
  name: string;
  method: HttpMethod;
  /** Path after base URL. Use `<param>` for path variables. */
  path: string;
  /** Inherit collection bearer auth (default false = public / no auth). */
  auth?: boolean;
  body?: RequestBody;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

export function buildRequest(baseUrl: string, def: RequestDef): HttpieRequest {
  const { path, pathParams } = parsePathParams(def.path);
  const queryParams = def.query
    ? Object.entries(def.query).map(([name, value]) => listItem(name, value))
    : [];

  const headers = def.headers
    ? Object.entries(def.headers).map(([name, value]) => listItem(name, value))
    : [];

  return {
    name: `${def.group}: ${def.name}`,
    url: `${baseUrl}${path}`,
    method: def.method,
    headers,
    queryParams,
    pathParams,
    auth: def.auth ? authInherited() : authNone(),
    body: def.body ?? bodyNone(),
  };
}

export function buildCollection(
  name: string,
  requests: RequestDef[],
  options?: { baseUrl?: string; bearerToken?: string; icon?: { name: IconName; color: Color } }
): HttpieCollection {
  const baseUrl = options?.baseUrl ?? '{{environment}}';
  return {
    name,
    icon: options?.icon ?? { name: 'default', color: 'pink' },
    auth: authBearer(options?.bearerToken ?? '<token>'),
    requests: requests.map((def) => buildRequest(baseUrl, def)),
  };
}

export function collectionMeta(): HttpieMeta {
  return {
    format: 'httpie',
    version: '1.0.0',
    contentType: 'collection',
    schema: HTTPIE_SCHEMA_URL,
    docs: 'https://httpie.io/r/help/export-from-httpie',
    source: 'giftistry-bun/collections/generate-httpie-collection.ts',
  };
}

export function environmentMeta(): HttpieMeta {
  return {
    format: 'httpie',
    version: '1.0.0',
    contentType: 'environment',
    schema: HTTPIE_SCHEMA_URL,
    docs: 'https://httpie.io/r/help/export-from-httpie',
    source: 'giftistry-bun/collections/generate-httpie-collection.ts',
  };
}

export function localEnvironment(url = 'http://localhost:3001'): HttpieEnvironment {
  return {
    name: 'Local',
    isDefault: true,
    isLocalOnly: true,
    color: 'green',
    variables: [{ name: 'environment', value: url, isSecret: false }],
  };
}

/** Validates export documents against HTTPie schema v1.0.0 enums and required fields. */
export function validateCollectionSchema(collection: HttpieCollection): string[] {
  const errors = validateCollection(collection);

  if (collection.icon) {
    if (!ICON_NAMES.includes(collection.icon.name)) {
      errors.push(
        `collection.icon.name "${collection.icon.name}" is not a valid IconName (see ${HTTPIE_SCHEMA_URL}#/definitions/IconName)`
      );
    }
    if (!COLORS.includes(collection.icon.color)) {
      errors.push(`collection.icon.color "${collection.icon.color}" is not a valid Color`);
    }
  }

  if (!AUTH_TYPES_WITHOUT_INHERITED.includes(collection.auth.type)) {
    errors.push(`collection.auth.type "${collection.auth.type}" is invalid`);
  }

  if (collection.auth.credentials) {
    if (collection.auth.credentials.username === undefined) {
      errors.push('collection.auth.credentials.username is required when credentials are set');
    }
    if (collection.auth.credentials.password === undefined) {
      errors.push('collection.auth.credentials.password is required when credentials are set');
    }
  }

  if (collection.auth.type === 'bearer' && !collection.auth.credentials?.password) {
    errors.push('collection bearer auth requires credentials.password (the token)');
  }

  for (const [i, req] of collection.requests.entries()) {
    const prefix = `requests[${i}] (${req.name})`;

    if (!AUTH_TYPES_WITH_INHERITED.includes(req.auth.type)) {
      errors.push(`${prefix}: auth.type "${req.auth.type}" is invalid`);
    }

    if (!REQUEST_BODY_TYPES.includes(req.body.type)) {
      errors.push(`${prefix}: body.type "${req.body.type}" is invalid`);
    }

    if (req.body.type === 'text') {
      if (!req.body.text) {
        errors.push(`${prefix}: body.text is required when type is text`);
      } else if (!REQUEST_MIME_TYPES.includes(req.body.text.format)) {
        errors.push(`${prefix}: body.text.format "${req.body.text.format}" is invalid`);
      }
    }

    if (req.body.type === 'form' && req.body.form) {
      for (const [j, field] of req.body.form.fields.entries()) {
        if (!['text', 'file', 'filetext'].includes(field.type)) {
          errors.push(`${prefix}: body.form.fields[${j}].type "${field.type}" is invalid`);
        }
      }
    }

    if (req.url.includes('/:') && req.pathParams.length === 0) {
      errors.push(`${prefix}: url contains /:param segments but pathParams is empty`);
    }

    for (const param of req.pathParams) {
      if (!req.url.includes(`/:${param.name}`)) {
        errors.push(`${prefix}: pathParam "${param.name}" is not present in url as /:${param.name}`);
      }
    }
  }

  return errors;
}

export function collectVariableReferences(value: unknown, refs = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    for (const match of value.matchAll(/\{\{([^}]+)\}\}/g)) {
      refs.add(match[1]);
    }
    return refs;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectVariableReferences(item, refs);
    return refs;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectVariableReferences(item, refs);
  }
  return refs;
}

export function validateVariableReferences(
  collection: HttpieCollection,
  environment: HttpieEnvironment
): string[] {
  const refs = collectVariableReferences(collection);
  const defined = new Set(environment.variables.map((v) => v.name));
  return [...refs]
    .filter((ref) => !defined.has(ref))
    .map((ref) => `variable reference {{${ref}}} is not defined in the environment`);
}

/** Lightweight validator for the subset of rules we care about at generation time. */
export function validateCollection(collection: HttpieCollection): string[] {
  const errors: string[] = [];

  if (!collection.name) errors.push('collection.name is required');
  if (!collection.auth?.type) errors.push('collection.auth.type is required');
  if (!Array.isArray(collection.requests)) errors.push('collection.requests must be an array');

  for (const [i, req] of collection.requests.entries()) {
    const prefix = `requests[${i}] (${req.name ?? 'unnamed'})`;
    if (!req.url) errors.push(`${prefix}: url is required`);
    if (!req.method) errors.push(`${prefix}: method is required`);
    if (!req.auth?.type) errors.push(`${prefix}: auth.type is required`);
    if (!req.body?.type) errors.push(`${prefix}: body.type is required`);
    for (const field of ['headers', 'queryParams', 'pathParams'] as const) {
      for (const [j, item] of req[field].entries()) {
        if (item.enabled === undefined) errors.push(`${prefix}.${field}[${j}]: enabled is required`);
        if (!item.name) errors.push(`${prefix}.${field}[${j}]: name is required`);
        if (item.value === undefined) errors.push(`${prefix}.${field}[${j}]: value is required`);
      }
    }
    if (req.body.type === 'text' && !req.body.text) {
      errors.push(`${prefix}: body.text is required when type is text`);
    }
    if (req.body.type === 'form' && !req.body.form) {
      errors.push(`${prefix}: body.form is required when type is form`);
    }
    if (req.body.type === 'graphql' && !req.body.graphql) {
      errors.push(`${prefix}: body.graphql is required when type is graphql`);
    }
    if (req.url.includes('<') || req.url.includes('>')) {
      errors.push(`${prefix}: url must use /:param syntax, not <param> placeholders`);
    }
  }

  return errors;
}

export function validateEnvironment(env: HttpieEnvironment): string[] {
  const errors: string[] = [];
  if (env.isDefault === undefined) errors.push('environment.isDefault is required');
  if (env.isLocalOnly === undefined) errors.push('environment.isLocalOnly is required');
  if (!Array.isArray(env.variables)) errors.push('environment.variables must be an array');
  for (const [i, v] of env.variables.entries()) {
    if (!v.name) errors.push(`variables[${i}].name is required`);
    if (v.value === undefined) errors.push(`variables[${i}].value is required`);
    if (v.isSecret === undefined) errors.push(`variables[${i}].isSecret is required`);
  }
  return errors;
}
