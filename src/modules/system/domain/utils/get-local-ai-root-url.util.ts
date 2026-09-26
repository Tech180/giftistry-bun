export function getLocalAiRootUrl(normalizedEndpoint: string): string {
  return normalizedEndpoint.replace(/\/v1\/?$/, '');
}
