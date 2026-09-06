import { describe, expect, test } from 'bun:test';
import { computeItemClaimSummary } from '../domain/compute-item-claim-summary.util';
import type { Claim, ItemLink } from '../domain/item.entity';

describe('computeItemClaimSummary', () => {
  const links: ItemLink[] = [
    {
      Id: 'l1',
      ItemId: 'i1',
      Url: 'https://example.com',
      ExtractedPrice: 100,
    } as ItemLink,
  ];

  test('treats exclusive Amount null as fully claimed when group funds enabled', () => {
    const claims: Claim[] = [
      {
        Id: 'c1',
        ItemId: 'i1',
        UserId: 'u1',
        Amount: null,
        ClaimedByName: 'A',
        Anonymous: false,
        ClaimedAt: new Date(),
        Quantity: 1,
        Selection: null,
      },
    ];

    const summary = computeItemClaimSummary({
      claims,
      links,
      allowGroupFunds: true,
    });

    expect(summary.IsFullyClaimed).toBe(true);
    expect(summary.FundingTarget).toBe(100);
    expect(summary.TotalClaimedAmount).toBe(0);
  });

  test('marks fully funded when partial amounts meet target', () => {
    const claims: Claim[] = [
      {
        Id: 'c1',
        ItemId: 'i1',
        UserId: 'u1',
        Amount: 40,
        ClaimedByName: 'A',
        Anonymous: false,
        ClaimedAt: new Date(),
        Quantity: 1,
        Selection: null,
      },
      {
        Id: 'c2',
        ItemId: 'i1',
        UserId: 'u2',
        Amount: 60,
        ClaimedByName: 'B',
        Anonymous: false,
        ClaimedAt: new Date(),
        Quantity: 1,
        Selection: null,
      },
    ];

    const summary = computeItemClaimSummary({
      claims,
      links,
      allowGroupFunds: true,
    });

    expect(summary.IsFullyClaimed).toBe(true);
    expect(summary.TotalClaimedAmount).toBe(100);
  });

  test('marks fully funded when float drift makes sum slightly below target', () => {
    const claims: Claim[] = [
      {
        Id: 'c1',
        ItemId: 'i1',
        UserId: 'u1',
        Amount: 30,
        ClaimedByName: 'A',
        Anonymous: false,
        ClaimedAt: new Date(),
        Quantity: 1,
        Selection: null,
      },
      {
        Id: 'c2',
        ItemId: 'i1',
        UserId: 'u2',
        Amount: 19.99,
        ClaimedByName: 'B',
        Anonymous: false,
        ClaimedAt: new Date(),
        Quantity: 1,
        Selection: null,
      },
    ];

    const links49: ItemLink[] = [
      {
        Id: 'l1',
        ItemId: 'i1',
        Url: 'https://example.com',
        ExtractedPrice: 49.99,
      } as ItemLink,
    ];

    const summary = computeItemClaimSummary({
      claims,
      links: links49,
      allowGroupFunds: true,
    });

    expect(summary.IsFullyClaimed).toBe(true);
    expect(summary.FundingTarget).toBe(49.99);
    expect(summary.TotalClaimedAmount).toBe(49.989999999999995);
  });
});
