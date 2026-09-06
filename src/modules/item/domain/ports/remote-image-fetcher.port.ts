export interface RemoteImageFetcher {
  /**
   * Download a remote image and return a validated `data:<mime>;base64,...` URL.
   * Returns null on any failure (invalid URL, SSRF, size/MIME, network).
   */
  fetchAsDataUrl(url: string): Promise<string | null>;
}
