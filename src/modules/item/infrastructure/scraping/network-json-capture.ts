import type { Page, Response } from 'playwright';

const JSON_URL_PATTERNS = ['/product', '/pdp', '/api/', '/graphql', '/catalog', '/item'];

export class NetworkJsonCapture {
  private readonly payloads: unknown[] = [];

  attach(page: Page): void {
    page.on('response', (response) => {
      void this.handleResponse(response);
    });
  }

  getPayloads(): unknown[] {
    return [...this.payloads];
  }

  private async handleResponse(response: Response): Promise<void> {
    try {
      const contentType = response.headers()['content-type'] ?? '';
      if (!contentType.includes('application/json')) return;

      const url = response.url().toLowerCase();
      const matchesPattern = JSON_URL_PATTERNS.some((pattern) => url.includes(pattern));
      if (!matchesPattern) return;

      const status = response.status();
      if (status < 200 || status >= 400) return;

      const body = await response.text();
      if (!body || body.length < 20) return;

      const parsed = JSON.parse(body) as unknown;
      this.payloads.push(parsed);
    } catch {
      // ignore non-JSON or unreadable responses
    }
  }
}
