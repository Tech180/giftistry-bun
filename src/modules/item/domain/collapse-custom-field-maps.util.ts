type FieldMap = Record<string, string>;

/** Identity for custom field keys: Form Factor === FormFactor === formfactor */
export function normalizeCustomFieldKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function preferCanonicalKey(existing: string, incoming: string): string {
  const existingHasSpace = /\s/.test(existing);
  const incomingHasSpace = /\s/.test(incoming);
  if (incomingHasSpace && !existingHasSpace) return incoming;
  if (existingHasSpace && !incomingHasSpace) return existing;

  const pascal = /^[A-Z][A-Za-z0-9]+$/;
  if (pascal.test(incoming) && !pascal.test(existing)) return incoming;
  if (pascal.test(existing) && !pascal.test(incoming)) return existing;

  return incoming;
}

/**
 * Collapse a field map so label-equivalent keys become one entry.
 * Later entries overwrite earlier values; canonical key follows preferCanonicalKey.
 */
export function collapseFieldMap(map: FieldMap | null | undefined): FieldMap {
  const out: FieldMap = {};
  const identityToKey = new Map<string, string>();

  for (const [rawKey, rawValue] of Object.entries(map ?? {})) {
    const key = rawKey.trim();
    const value = String(rawValue ?? '').trim();
    if (!key || !value) continue;

    const identity = normalizeCustomFieldKey(key);
    if (!identity) continue;

    const existingKey = identityToKey.get(identity);
    if (!existingKey) {
      identityToKey.set(identity, key);
      out[key] = value;
      continue;
    }

    const canonical = preferCanonicalKey(existingKey, key);
    if (canonical !== existingKey) {
      delete out[existingKey];
      identityToKey.set(identity, canonical);
      out[canonical] = value;
    } else {
      out[existingKey] = value;
    }
  }

  return out;
}

/**
 * Merge two field maps with normalized-key identity. Incoming wins on collision.
 * When preferBase is true, base wins when both have a value for the same identity.
 */
export function mergeFieldMapsByNormalizedKey(
  base: FieldMap | null | undefined,
  incoming: FieldMap | null | undefined,
  preferBase = false
): FieldMap {
  if (preferBase) {
    return collapseFieldMap({
      ...collapseFieldMap(incoming),
      ...collapseFieldMap(base),
    });
  }
  return collapseFieldMap({
    ...collapseFieldMap(base),
    ...collapseFieldMap(incoming),
  });
}

/**
 * Drop UserDefined entries whose normalize equals any Predefined key.
 * Predefined wins.
 */
export function dedupePredefinedVsUserDefined(
  predefined: FieldMap | null | undefined,
  userDefined: FieldMap | null | undefined
): { predefined: FieldMap; userDefined: FieldMap } {
  const nextPredefined = collapseFieldMap(predefined);
  const predefinedIdentities = new Set(
    Object.keys(nextPredefined).map((key) => normalizeCustomFieldKey(key))
  );

  const nextUserDefined: FieldMap = {};
  for (const [key, value] of Object.entries(collapseFieldMap(userDefined))) {
    const identity = normalizeCustomFieldKey(key);
    if (predefinedIdentities.has(identity)) continue;
    nextUserDefined[key] = value;
  }

  return { predefined: nextPredefined, userDefined: nextUserDefined };
}
