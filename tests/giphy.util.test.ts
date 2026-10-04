import { describe, expect, test } from 'bun:test';
import { isGiphyCdnHost } from '../src/modules/giphy/domain/utils/is-giphy-cdn-host.util';
import { mapGiphyApiItem } from '../src/modules/giphy/infrastructure/utils/map-giphy-api-item.util';

describe('isGiphyCdnHost', () => {
  test('accepts GIPHY CDN hostnames', () => {
    expect(isGiphyCdnHost('media.giphy.com')).toBe(true);
    expect(isGiphyCdnHost('i.giphy.com')).toBe(true);
  });

  test('rejects other hosts', () => {
    expect(isGiphyCdnHost('example.com')).toBe(false);
    expect(isGiphyCdnHost('notgiphy.com')).toBe(false);
  });
});

describe('mapGiphyApiItem', () => {
  test('maps valid API row', () => {
    const mapped = mapGiphyApiItem({
      id: 'x',
      title: 'Wave',
      images: {
        fixed_height_small: { url: 'https://media.giphy.com/media/x/200.gif' },
        original: { url: 'https://media.giphy.com/media/x/giphy.gif' },
      },
    });
    expect(mapped).toEqual({
      id: 'x',
      url: 'https://media.giphy.com/media/x/200.gif',
      originalUrl: 'https://media.giphy.com/media/x/giphy.gif',
      title: 'Wave',
    });
  });

  test('returns null when preview URL missing', () => {
    expect(mapGiphyApiItem({ id: 'x', images: {} })).toBeNull();
  });
});
