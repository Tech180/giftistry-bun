import { describe, expect, test } from 'bun:test';
import { reconcileFields } from '../src/modules/item/domain/utils/reconcile-fields.util';

describe('reconcileFields', () => {
  test('prefers json-ld price over slug', () => {
    const result = reconcileFields({
      prices: [
        { value: 12, confidence: 0.9, source: 'slug' },
        { value: 19.99, confidence: 0.95, source: 'json-ld', evidence: 'offers.price' },
      ],
    });
    expect(result.price?.value).toBe(19.99);
    expect(result.price?.source).toBe('json-ld');
  });

  test('votes availability by weighted score', () => {
    const result = reconcileFields({
      availabilities: [
        { value: 'out_of_stock', confidence: 0.6, source: 'dom' },
        { value: 'in_stock', confidence: 0.9, source: 'json-ld' },
        { value: 'in_stock', confidence: 0.7, source: 'open-graph' },
      ],
    });
    expect(result.availability?.value).toBe('in_stock');
  });
});
