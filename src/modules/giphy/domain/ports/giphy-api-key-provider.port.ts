export interface GiphyApiKeyProvider {
  getApiKey(): string | null;
}
