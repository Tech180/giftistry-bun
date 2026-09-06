import { describe, expect, test } from 'bun:test';
import { buildSubstitutionSummaryWithClaimSummary } from './build-substitution-summary-with-claim-summary.util';
import type { Claim, Item, ItemLink } from './item.entity';

function childItem(overrides: Partial<Item> = {}): Item {
  return {
    Id: 'child-1',
    ListId: 'list-1',
    PriorityId: null,
    SuggestedByUserId: null,
    Name: 'Alt gift',
    Description: 'Child notes',
    IsHiddenIdea: false,
    Category: 'home',
    ...overrides,
  };
}

describe('buildSubstitutionSummaryWithClaimSummary', () => {
  const links: ItemLink[] = [
    {
      Id: 'l1',
      ItemId: 'child-1',
      Url: 'https://example.com/alt',
      RetailerName: null,
      ExtractedPrice: 30,
      ExtractedImageUrl: null,
    },
  ];

  test('returns per-variant funding aggregates from child links and claims', () => {
    const claims: Claim[] = [
      {
        Id: 'c1',
        ItemId: 'child-1',
        UserId: 'u1',
        Amount: 10,
        ClaimedByName: 'Pat',
        Anonymous: false,
        ClaimedAt: new Date(),
        Quantity: 1,
        Selection: null,
      },
    ];

    const summary = buildSubstitutionSummaryWithClaimSummary(
      childItem(),
      links,
      claims,
      { allowGroupFunds: true }
    );

    expect(summary.FundingTarget).toBe(30);
    expect(summary.TotalClaimedAmount).toBe(10);
    expect(summary.TotalClaimedQuantity).toBe(1);
    expect(summary.IsClaimed).toBe(true);
    expect(summary.IsFullyClaimed).toBe(false);
  });

  test('does not inherit parent funding — empty child claims yield zero claimed', () => {
    const summary = buildSubstitutionSummaryWithClaimSummary(
      childItem(),
      links,
      [],
      { allowGroupFunds: true }
    );

    expect(summary.FundingTarget).toBe(30);
    expect(summary.TotalClaimedAmount).toBe(0);
    expect(summary.IsClaimed).toBe(false);
  });

  test('hides funding when hideClaims is true', () => {
    const claims: Claim[] = [
      {
        Id: 'c1',
        ItemId: 'child-1',
        UserId: 'u1',
        Amount: 10,
        ClaimedByName: 'Pat',
        Anonymous: false,
        ClaimedAt: new Date(),
        Quantity: 1,
        Selection: null,
      },
    ];

    const summary = buildSubstitutionSummaryWithClaimSummary(
      childItem(),
      links,
      claims,
      { allowGroupFunds: true, hideClaims: true }
    );

    expect(summary.FundingTarget).toBe(0);
    expect(summary.TotalClaimedAmount).toBe(0);
    expect(summary.IsFullyClaimed).toBe(false);
  });
});
