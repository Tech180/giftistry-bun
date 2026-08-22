import { resolveClaimDisplayNames } from './resolve-claim-display-names.util';

describe('resolveClaimDisplayNames', () => {
  it('dedupes named claimants by user id', () => {
    expect(
      resolveClaimDisplayNames([
        { UserId: 'user-1', ClaimedByName: 'Jamie Lee', Anonymous: false },
        { UserId: 'user-1', ClaimedByName: 'Jamie Lee', Anonymous: false },
        { UserId: 'user-2', ClaimedByName: 'Alex Kim', Anonymous: false },
      ])
    ).toEqual(['Jamie Lee', 'Alex Kim']);
  });

  it('consolidates multiple anonymous claims into one entry', () => {
    expect(
      resolveClaimDisplayNames([
        { UserId: null, ClaimedByName: 'Anonymous', Anonymous: true },
        { UserId: 'user-9', ClaimedByName: 'Anonymous', Anonymous: true },
      ])
    ).toEqual(['Anonymous']);
  });

  it('lists named claimants then a single anonymous label', () => {
    expect(
      resolveClaimDisplayNames([
        { UserId: 'user-1', ClaimedByName: 'Riley Lawson', Anonymous: false },
        { UserId: 'user-1', ClaimedByName: 'Riley Lawson', Anonymous: false },
        { UserId: null, ClaimedByName: 'Anonymous', Anonymous: true },
      ])
    ).toEqual(['Riley Lawson', 'Anonymous']);
  });

  it('shows the current user name for their own anonymous claim', () => {
    expect(
      resolveClaimDisplayNames(
        [
          { UserId: 'user-1', ClaimedByName: 'Riley Lawson', Anonymous: true },
          { UserId: 'user-2', ClaimedByName: 'Anonymous', Anonymous: true },
        ],
        'user-1'
      )
    ).toEqual(['Riley Lawson', 'Anonymous']);
  });
});
