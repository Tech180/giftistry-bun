import { describe, expect, test } from 'bun:test';
import { isPrivateNetworkAddress } from '../src/modules/item/domain/utils/is-private-network-address.util';
import {
  resolveScrapeFinalUrl,
  assertScrapeUrlSafe,
} from '../src/modules/item/domain/utils/scrape-url-safety.util';
import { resolvePublicHost } from '../src/modules/item/infrastructure/scraping/utils/resolve-public-host.util';
import {
  safeFetch,
  UnsafeUrlError,
} from '../src/modules/item/infrastructure/scraping/utils/safe-fetch.util';
import { readLimitedBody } from '../src/modules/item/infrastructure/scraping/utils/read-limited-body.util';

describe('isPrivateNetworkAddress', () => {
  test('rejects localhost and metadata hosts', () => {
    expect(isPrivateNetworkAddress('localhost')).toBe(true);
    expect(isPrivateNetworkAddress('foo.localhost')).toBe(true);
    expect(isPrivateNetworkAddress('printer.local')).toBe(true);
    expect(isPrivateNetworkAddress('svc.internal')).toBe(true);
    expect(isPrivateNetworkAddress('metadata.google.internal')).toBe(true);
    expect(isPrivateNetworkAddress('intranet')).toBe(true);
  });

  test('rejects private IPv4 ranges', () => {
    expect(isPrivateNetworkAddress('10.0.0.1')).toBe(true);
    expect(isPrivateNetworkAddress('127.0.0.1')).toBe(true);
    expect(isPrivateNetworkAddress('0.0.0.0')).toBe(true);
    expect(isPrivateNetworkAddress('169.254.169.254')).toBe(true);
    expect(isPrivateNetworkAddress('172.16.5.1')).toBe(true);
    expect(isPrivateNetworkAddress('192.168.1.1')).toBe(true);
    expect(isPrivateNetworkAddress('100.64.1.1')).toBe(true);
    expect(isPrivateNetworkAddress('192.0.0.1')).toBe(true);
    expect(isPrivateNetworkAddress('198.18.0.1')).toBe(true);
    expect(isPrivateNetworkAddress('224.0.0.1')).toBe(true);
  });

  test('rejects decimal/hex/octal IP forms', () => {
    expect(isPrivateNetworkAddress('2130706433')).toBe(true); // 127.0.0.1 decimal
    expect(isPrivateNetworkAddress('0x7f000001')).toBe(true);
  });

  test('rejects IPv6 loopback, ULA, link-local, and mapped', () => {
    expect(isPrivateNetworkAddress('::1')).toBe(true);
    expect(isPrivateNetworkAddress('::')).toBe(true);
    expect(isPrivateNetworkAddress('fc00::1')).toBe(true);
    expect(isPrivateNetworkAddress('fd12::1')).toBe(true);
    expect(isPrivateNetworkAddress('fe80::1')).toBe(true);
    expect(isPrivateNetworkAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateNetworkAddress('64:ff9b::10.0.0.1')).toBe(true);
  });

  test('allows public hosts', () => {
    expect(isPrivateNetworkAddress('example.com')).toBe(false);
    expect(isPrivateNetworkAddress('8.8.8.8')).toBe(false);
    expect(isPrivateNetworkAddress('1.1.1.1')).toBe(false);
  });
});

describe('resolveScrapeFinalUrl / assertScrapeUrlSafe', () => {
  test('rejects credentials and private hosts', () => {
    expect(resolveScrapeFinalUrl('http://evil@127.0.0.1/', 'https://example.com')).toBeNull();
    expect(resolveScrapeFinalUrl('https://192.168.0.1/p', 'https://example.com')).toBeNull();
    expect(() => assertScrapeUrlSafe('http://user:pass@example.com/')).toThrow();
    expect(() => assertScrapeUrlSafe('ftp://example.com/')).toThrow();
  });

  test('accepts public product URLs', () => {
    expect(resolveScrapeFinalUrl('https://www.amazon.com/dp/B0TEST', 'https://a.co/x')).toBe(
      'https://www.amazon.com/dp/B0TEST'
    );
    expect(assertScrapeUrlSafe('https://shop.example/p/1').hostname).toBe('shop.example');
  });
});

describe('resolvePublicHost', () => {
  test('rejects injected private DNS answers', async () => {
    await expect(
      resolvePublicHost('evil.example', async () => ['10.0.0.5'])
    ).rejects.toThrow(/private address/);
  });

  test('rejects private hostname before DNS', async () => {
    await expect(resolvePublicHost('127.0.0.1', async () => ['8.8.8.8'])).rejects.toThrow(
      /Unsafe hostname/
    );
  });

  test('accepts public answers', async () => {
    const addresses = await resolvePublicHost('example.com', async () => ['93.184.216.34']);
    expect(addresses).toEqual(['93.184.216.34']);
  });
});

describe('readLimitedBody', () => {
  test('truncates oversized bodies', async () => {
    const body = 'x'.repeat(100);
    const response = new Response(body, { headers: { 'content-type': 'text/html' } });
    const result = await readLimitedBody(response, 20);
    expect(result.truncated).toBe(true);
    expect(result.body.length).toBe(20);
  });
});

describe('safeFetch', () => {
  test('rejects credential URLs and private literals without network', async () => {
    await expect(safeFetch('http://evil@127.0.0.1/')).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(safeFetch('http://169.254.169.254/latest')).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  test('rejects redirect hop to private IP via injected resolver', async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(null, {
          status: 302,
          headers: { Location: 'http://169.254.169.254/meta' },
        });
      }
      return new Response('should not reach', { status: 200 });
    }) as typeof fetch;

    try {
      await expect(
        safeFetch('https://public.example/start', {
          resolver: async (host) => {
            if (host === 'public.example') {
              return ['93.184.216.34'];
            }
            throw new Error(`unexpected host ${host}`);
          },
        })
      ).rejects.toBeInstanceOf(UnsafeUrlError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('returns body and status on 404', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response('<html>missing</html>', {
        status: 404,
        headers: { 'content-type': 'text/html' },
      })) as typeof fetch;

    try {
      const result = await safeFetch('https://public.example/missing', {
        resolver: async () => ['93.184.216.34'],
      });
      expect(result.status).toBe(404);
      expect(result.body).toContain('missing');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('rejects unsupported content type on 2xx', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response('MZ....', {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      })) as typeof fetch;

    try {
      await expect(
        safeFetch('https://public.example/bin', {
          resolver: async () => ['93.184.216.34'],
        })
      ).rejects.toBeInstanceOf(UnsafeUrlError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
