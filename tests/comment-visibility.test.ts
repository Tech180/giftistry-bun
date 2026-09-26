import { describe, expect, test } from 'bun:test';
import { canUserViewComment } from '../src/modules/comment/domain/utils/can-user-view-comment.util';
import { resolveVisibilityMode } from '../src/modules/comment/domain/utils/resolve-visibility-mode.util';
import { validateMentionsInAudience } from '../src/modules/comment/domain/utils/validate-mentions-in-audience.util';
import { validateVisibilityPayload } from '../src/modules/comment/domain/utils/validate-visibility-payload.util';

describe('comment visibility', () => {
  test('resolveVisibilityMode maps legacy and selected payloads', () => {
    expect(
      resolveVisibilityMode({ IsOwnerVisible: false, VisibleToUserIds: null })
    ).toBe('hiddenFromOwner');
    expect(
      resolveVisibilityMode({ IsOwnerVisible: true, VisibleToUserIds: null })
    ).toBe('visibleToAll');
    expect(
      resolveVisibilityMode({
        IsOwnerVisible: true,
        VisibleToUserIds: ['u1'],
      })
    ).toBe('visibleToSelected');
  });

  test('canUserViewComment enforces selected audience before expiry', () => {
    const comment = {
      UserId: 'author',
      IsOwnerVisible: true,
      VisibleToUserIds: ['owner', 'viewer-a'],
    };
    expect(
      canUserViewComment({
        comment,
        viewerUserId: 'viewer-b',
        wishlistOwnerId: 'owner',
        hasExpired: false,
      })
    ).toBe(false);
    expect(
      canUserViewComment({
        comment,
        viewerUserId: 'viewer-a',
        wishlistOwnerId: 'owner',
        hasExpired: false,
      })
    ).toBe(true);
    expect(
      canUserViewComment({
        comment,
        viewerUserId: 'viewer-b',
        wishlistOwnerId: 'owner',
        hasExpired: true,
      })
    ).toBe(true);
  });

  test('validateMentionsInAudience rejects mentions outside selected audience', () => {
    expect(() =>
      validateMentionsInAudience(
        'Hey [Alice](user:alice) and [Bob](user:bob)',
        ['alice'],
        'author'
      )
    ).toThrow();
    expect(() =>
      validateMentionsInAudience(
        'Hey [Alice](user:alice)',
        ['alice'],
        'author'
      )
    ).not.toThrow();
  });

  test('validateVisibilityPayload rejects non-participants', () => {
    expect(() =>
      validateVisibilityPayload({
        isOwner: false,
        isOwnerVisible: true,
        visibleToUserIds: ['outsider'],
        allowedParticipantIds: new Set(['owner', 'author']),
      })
    ).toThrow();
  });
});
