export interface GiphyCdnImageFetcher {
  fetchAsDataUrl(url: string): Promise<string | null>;
}
