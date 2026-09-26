import { describe, expect, test } from 'bun:test';
import { assertSafeRemoteImageUrl } from '../src/modules/item/infrastructure/utils/remote-image.util';

describe('assertSafeRemoteImageUrl', () => {
  test('accepts https public URLs', () => {
    const url = assertSafeRemoteImageUrl('https://cdn.example.com/product.jpg');
    expect(url?.hostname).toBe('cdn.example.com');
  });

  test('rejects http', () => {
    expect(assertSafeRemoteImageUrl('http://cdn.example.com/a.jpg')).toBeNull();
  });

  test('rejects credentials in URL', () => {
    expect(assertSafeRemoteImageUrl('https://user:pass@cdn.example.com/a.jpg')).toBeNull();
  });

  test('rejects localhost and private IPv4', () => {
    expect(assertSafeRemoteImageUrl('https://localhost/a.jpg')).toBeNull();
    expect(assertSafeRemoteImageUrl('https://127.0.0.1/a.jpg')).toBeNull();
    expect(assertSafeRemoteImageUrl('https://10.0.0.5/a.jpg')).toBeNull();
    expect(assertSafeRemoteImageUrl('https://192.168.1.1/a.jpg')).toBeNull();
    expect(assertSafeRemoteImageUrl('https://172.16.0.1/a.jpg')).toBeNull();
    expect(assertSafeRemoteImageUrl('https://169.254.169.254/latest')).toBeNull();
  });

  test('rejects invalid URLs', () => {
    expect(assertSafeRemoteImageUrl('not a url')).toBeNull();
    expect(assertSafeRemoteImageUrl('')).toBeNull();
  });
});
