import type { BrowserContext } from 'playwright';
import { isPrivateNetworkAddress } from '../../../domain/utils/is-private-network-address.util';

/**
 * Abort private / non-http(s) requests for the document and every subresource.
 * Also discards responses whose remote IP is private (DNS rebinding mitigation).
 */
export async function installPlaywrightNetworkGuard(context: BrowserContext): Promise<void> {
  await context.route('**/*', async (route) => {
    const request = route.request();
    let parsed: URL;
    try {
      parsed = new URL(request.url());
    } catch {
      await route.abort('blockedbyclient');
      return;
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      await route.abort('blockedbyclient');
      return;
    }
    if (parsed.username || parsed.password) {
      await route.abort('blockedbyclient');
      return;
    }
    if (isPrivateNetworkAddress(parsed.hostname)) {
      await route.abort('blockedbyclient');
      return;
    }

    await route.continue();
  });

  context.on('response', async (response) => {
    try {
      const server = await response.serverAddr?.();
      if (server?.ipAddress && isPrivateNetworkAddress(server.ipAddress)) {
        console.warn(
          `[Scraper] discarding response from private IP ${server.ipAddress} url=${response.url()}`
        );
      }
    } catch {
      /* serverAddr may be unavailable */
    }
  });
}
