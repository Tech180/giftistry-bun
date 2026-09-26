import { describe, expect, test } from 'bun:test';
import {
  getGroupFundContributorUserIds,
  isGroupFundContribution,
  redactClaimsForViewer,
  shouldRevealAnonymousClaim,
} from './redact-claims-for-viewer.util';
import type { Claim } from '../interfaces/claim.interface';

const baseClaim = (overrides: Partial<Claim>): Claim => ({
  Id: 'claim-1',
  ItemId: 'item-1',
  UserId: 'user-a',
  Amount: 30,
  ClaimedByName: 'Alice',
  Anonymous: true,
  ...overrides,
});

describe('isGroupFundContribution', () => {
  test('returns true for partial amounts', () => {
    expect(isGroupFundContribution({ Amount: 30 })).toBe(true);
  });

  test('returns false for exclusive claims', () => {
    expect(isGroupFundContribution({ Amount: null })).toBe(false);
    expect(isGroupFundContribution({ Amount: 0 })).toBe(false);
  });
});

describe('getGroupFundContributorUserIds', () => {
  test('collects users with positive partial amounts', () => {
    expect(
      getGroupFundContributorUserIds([
        { UserId: 'user-a', Amount: 30 },
        { UserId: 'user-b', Amount: 19.99 },
        { UserId: 'user-c', Amount: null },
      ])
    ).toEqual(new Set(['user-a', 'user-b']));
  });
});

describe('shouldRevealAnonymousClaim', () => {
  const contributorIds = new Set(['user-a', 'user-b']);

  test('reveals to the claimant', () => {
    expect(
      shouldRevealAnonymousClaim(
        baseClaim({ UserId: 'user-a' }),
        'user-a',
        contributorIds
      )
    ).toBe(true);
  });

  test('reveals fellow group-fund contributors', () => {
    expect(
      shouldRevealAnonymousClaim(
        baseClaim({ UserId: 'user-a' }),
        'user-b',
        contributorIds
      )
    ).toBe(true);
  });

  test('hides from non-contributors', () => {
    expect(
      shouldRevealAnonymousClaim(
        baseClaim({ UserId: 'user-a' }),
        'viewer-c',
        contributorIds
      )
    ).toBe(false);
  });

  test('hides exclusive anonymous claims from other users', () => {
    expect(
      shouldRevealAnonymousClaim(
        baseClaim({ UserId: 'user-a', Amount: null }),
        'user-b',
        contributorIds
      )
    ).toBe(false);
  });

  test('reveals non-anonymous claims implicitly', () => {
    expect(
      shouldRevealAnonymousClaim(
        baseClaim({ Anonymous: false }),
        'viewer-c',
        contributorIds
      )
    ).toBe(true);
  });
});

describe('redactClaimsForViewer', () => {
  test('fellow contributors see full names for anonymous GF claims', () => {
    const claims = [
      baseClaim({ Id: '1', UserId: 'user-a', ClaimedByName: 'Alice' }),
      baseClaim({ Id: '2', UserId: 'user-b', ClaimedByName: 'Bob', Amount: 19.99 }),
    ];

    const redacted = redactClaimsForViewer(claims, 'user-b');
    expect(redacted[0]?.ClaimedByName).toBe('Alice');
    expect(redacted[0]?.UserId).toBe('user-a');
  });

  test('non-contributors see Anonymous', () => {
    const claims = [
      baseClaim({ Id: '1', UserId: 'user-a', ClaimedByName: 'Alice' }),
      baseClaim({ Id: '2', UserId: 'user-b', ClaimedByName: 'Bob', Amount: 19.99 }),
    ];

    const redacted = redactClaimsForViewer(claims, 'viewer-c');
    expect(redacted[0]?.ClaimedByName).toBe('Anonymous');
    expect(redacted[0]?.UserId).toBeNull();
    expect(redacted[1]?.ClaimedByName).toBe('Anonymous');
    expect(redacted[1]?.UserId).toBeNull();
  });

  test('exclusive anonymous claims stay hidden from other users', () => {
    const claims = [
      baseClaim({
        Id: '1',
        UserId: 'user-a',
        ClaimedByName: 'Alice',
        Amount: null,
      }),
    ];

    const redacted = redactClaimsForViewer(claims, 'user-b');
    expect(redacted[0]?.ClaimedByName).toBe('Anonymous');
    expect(redacted[0]?.UserId).toBeNull();
  });
});
