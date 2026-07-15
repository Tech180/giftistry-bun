export interface PageContextFetcher {
  fetchHtml(url: string): Promise<string>;
  fetchContext(url: string): Promise<string>;
  resolveWebsiteName(url: string, html?: string): string;
  buildContextFromHtml(html: string, url: string): string;
}
