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
