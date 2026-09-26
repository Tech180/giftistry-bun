import { describe, expect, it } from 'bun:test';
import { resolveClaimDisplayNames } from './resolve-claim-display-names.util';

describe('resolveClaimDisplayNames', () => {
  it('dedupes named claimants by user id', () => {
    expect(
      resolveClaimDisplayNames([
        { UserId: 'user-1', ClaimedByName: 'Jamie Lee', Anonymous: false, Amount: null },
        { UserId: 'user-1', ClaimedByName: 'Jamie Lee', Anonymous: false, Amount: null },
        { UserId: 'user-2', ClaimedByName: 'Alex Kim', Anonymous: false, Amount: null },
      ])
    ).toEqual(['Jamie Lee', 'Alex Kim']);
  });

  it('consolidates multiple anonymous claims into one entry', () => {
    expect(
      resolveClaimDisplayNames([
        { UserId: null, ClaimedByName: 'Anonymous', Anonymous: true, Amount: null },
        { UserId: 'user-9', ClaimedByName: 'Anonymous', Anonymous: true, Amount: null },
      ])
    ).toEqual(['Anonymous']);
  });

  it('lists named claimants then a single anonymous label', () => {
    expect(
      resolveClaimDisplayNames([
        { UserId: 'user-1', ClaimedByName: 'Riley Lawson', Anonymous: false, Amount: null },
        { UserId: 'user-1', ClaimedByName: 'Riley Lawson', Anonymous: false, Amount: null },
        { UserId: null, ClaimedByName: 'Anonymous', Anonymous: true, Amount: null },
      ])
    ).toEqual(['Riley Lawson', 'Anonymous']);
  });

  it('shows the current user name for their own anonymous claim', () => {
    expect(
      resolveClaimDisplayNames(
        [
          { UserId: 'user-1', ClaimedByName: 'Riley Lawson', Anonymous: true, Amount: null },
          { UserId: 'user-2', ClaimedByName: 'Anonymous', Anonymous: true, Amount: null },
        ],
        'user-1'
      )
    ).toEqual(['Riley Lawson', 'Anonymous']);
  });

  it('shows fellow group-fund contributors by name when both are anonymous', () => {
    expect(
      resolveClaimDisplayNames(
        [
          {
            UserId: 'user-1',
            ClaimedByName: 'Alice',
            Anonymous: true,
            Amount: 30,
          },
          {
            UserId: 'user-2',
            ClaimedByName: 'Bob',
            Anonymous: true,
            Amount: 19.99,
          },
        ],
        'user-2'
      )
    ).toEqual(['Alice', 'Bob']);
  });

  it('hides anonymous group-fund contributors from non-contributors', () => {
    expect(
      resolveClaimDisplayNames(
        [
          {
            UserId: 'user-1',
            ClaimedByName: 'Alice',
            Anonymous: true,
            Amount: 30,
          },
          {
            UserId: 'user-2',
            ClaimedByName: 'Bob',
            Anonymous: true,
            Amount: 19.99,
          },
        ],
        'viewer-c'
      )
    ).toEqual(['Anonymous']);
  });
});
