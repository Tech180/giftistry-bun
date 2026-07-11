export function normalizeLocalAiEndpoint(endpoint?: string | null): string | null {
  const trimmed = endpoint?.trim();
  if (!trimmed) {
    return null;
  }

  let baseEndpoint = trimmed.replace(/\/+$/, '');

  try {
    const parsed = new URL(baseEndpoint);
    const path = parsed.pathname.replace(/\/+$/, '') || '/';

    if (path === '/') {
      baseEndpoint = `${parsed.origin}/v1`;
    }
  } catch {
    return null;
  }

  return baseEndpoint;
}

export function getLocalAiRootUrl(normalizedEndpoint: string): string {
  return normalizedEndpoint.replace(/\/v1\/?$/, '');
}

export function buildLocalAiUrl(baseEndpoint: string, path: string): string {
  const normalized = normalizeLocalAiEndpoint(baseEndpoint);
  if (!normalized) {
    throw new Error('Local AI endpoint URL is required');
  }

  const suffix = path.startsWith('/') ? path.slice(1) : path;
  return `${normalized}/${suffix}`;
}
