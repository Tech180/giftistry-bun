import { normalizeLocalAiEndpoint } from './normalize-local-ai-endpoint.util';

export function buildLocalAiUrl(baseEndpoint: string, path: string): string {
  const normalized = normalizeLocalAiEndpoint(baseEndpoint);
  if (!normalized) {
    throw new Error('Local AI endpoint URL is required');
  }

  const suffix = path.startsWith('/') ? path.slice(1) : path;
  return `${normalized}/${suffix}`;
}
