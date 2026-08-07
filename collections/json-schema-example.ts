/**
 * Build a minimal example value from an OpenAPI / JSON Schema fragment.
 */

export interface JsonSchema {
  $ref?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  const?: unknown;
  example?: unknown;
  default?: unknown;
  nullable?: boolean;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
}

export interface OpenApiComponents {
  schemas?: Record<string, JsonSchema>;
}

const MAX_DEPTH = 12;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveRef(ref: string, components?: OpenApiComponents): JsonSchema | undefined {
  const prefix = '#/components/schemas/';
  if (!ref.startsWith(prefix) || !components?.schemas) return undefined;
  const name = ref.slice(prefix.length);
  return components.schemas[name];
}

function primaryType(schema: JsonSchema): string | undefined {
  if (typeof schema.type === 'string') return schema.type;
  if (Array.isArray(schema.type)) {
    return schema.type.find((t) => t !== 'null') ?? schema.type[0];
  }
  return undefined;
}

/**
 * Produce a JSON-serializable example from a schema.
 * Prefers `example` / `default`, then synthesizes from type structure.
 */
export function exampleFromSchema(
  schema: JsonSchema | undefined,
  components?: OpenApiComponents,
  depth = 0,
  seenRefs: ReadonlySet<string> = new Set()
): unknown {
  if (!schema || depth > MAX_DEPTH) return null;

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];

  if (schema.$ref) {
    if (seenRefs.has(schema.$ref)) return null;
    const resolved = resolveRef(schema.$ref, components);
    if (!resolved) return null;
    const nextSeen = new Set(seenRefs);
    nextSeen.add(schema.$ref);
    return exampleFromSchema(resolved, components, depth + 1, nextSeen);
  }

  if (schema.anyOf?.[0]) {
    return exampleFromSchema(schema.anyOf[0], components, depth + 1, seenRefs);
  }
  if (schema.oneOf?.[0]) {
    return exampleFromSchema(schema.oneOf[0], components, depth + 1, seenRefs);
  }
  if (schema.allOf && schema.allOf.length > 0) {
    const merged: Record<string, unknown> = {};
    for (const part of schema.allOf) {
      const value = exampleFromSchema(part, components, depth + 1, seenRefs);
      if (isObject(value)) Object.assign(merged, value);
    }
    return Object.keys(merged).length > 0 ? merged : null;
  }

  const type = primaryType(schema);

  if (type === 'object' || schema.properties) {
    const out: Record<string, unknown> = {};
    const props = schema.properties ?? {};
    const required = new Set(schema.required ?? Object.keys(props));
    for (const [key, propSchema] of Object.entries(props)) {
      if (!required.has(key) && depth > 2) continue;
      out[key] = exampleFromSchema(propSchema, components, depth + 1, seenRefs);
    }
    if (
      Object.keys(out).length === 0 &&
      schema.additionalProperties &&
      typeof schema.additionalProperties === 'object'
    ) {
      out.example = exampleFromSchema(schema.additionalProperties, components, depth + 1, seenRefs);
    }
    return out;
  }

  if (type === 'array') {
    if (!schema.items) return [];
    return [exampleFromSchema(schema.items, components, depth + 1, seenRefs)];
  }

  if (schema.nullable && type === undefined) return null;

  switch (type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'null':
      return null;
    default:
      return schema.nullable ? null : {};
  }
}
