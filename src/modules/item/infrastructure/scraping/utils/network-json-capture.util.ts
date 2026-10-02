import type { Page, Response } from 'playwright';
import {
  JSON_URL_PATTERNS,
  NETWORK_JSON_MAX_BYTES,
  NETWORK_JSON_MAX_PAYLOADS,
} from '../constants/json-url-patterns.constant';

function registrableHost(hostname: string): string {
  const parts = hostname.toLowerCase().replace(/^www\./, '').split('.');
  if (parts.length <= 2) {
    return parts.join('.');
  }
  return parts.slice(-2).join('.');
}

export class NetworkJsonCapture {
  private readonly payloads: unknown[] = [];
  private pageHost = '';

  attach(page: Page): void {
    try {
      this.pageHost = registrableHost(new URL(page.url()).hostname);
    } catch {
      this.pageHost = '';
    }

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        try {
          this.pageHost = registrableHost(new URL(frame.url()).hostname);
        } catch {
          /* keep */
        }
      }
    });

    page.on('response', (response) => {
      void this.handleResponse(response);
    });
  }

  getPayloads(): unknown[] {
    return [...this.payloads];
  }

  private async handleResponse(response: Response): Promise<void> {
    try {
      if (this.payloads.length >= NETWORK_JSON_MAX_PAYLOADS) {
        return;
      }

      const contentType = response.headers()['content-type'] ?? '';
      if (!contentType.includes('application/json')) {
        return;
      }

      const url = response.url().toLowerCase();
      const matchesPattern = JSON_URL_PATTERNS.some((pattern) => url.includes(pattern));
      if (!matchesPattern) {
        return;
      }

      try {
        const responseHost = registrableHost(new URL(response.url()).hostname);
        if (this.pageHost && responseHost !== this.pageHost) {
          return;
        }
      } catch {
        return;
      }

      const status = response.status();
      if (status < 200 || status >= 400) {
        return;
      }

      const body = await response.text();
      if (!body || body.length < 20 || body.length > NETWORK_JSON_MAX_BYTES) {
        return;
      }

      const parsed = JSON.parse(body) as unknown;
      this.payloads.push(parsed);
    } catch {
      // ignore non-JSON or unreadable responses
    }
  }
}
