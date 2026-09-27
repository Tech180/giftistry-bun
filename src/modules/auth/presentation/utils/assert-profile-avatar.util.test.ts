import { describe, expect, test } from 'bun:test';
import { AppError } from '@/common/domain/errors/app-error';
import {
  PROFILE_AVATAR_MAX_BYTES,
  PROFILE_AVATAR_MAX_MB,
} from '../constants/profile-avatar-max-bytes.constant';
import { assertProfileAvatar } from './assert-profile-avatar.util';

function pngDataUrl(decodedByteLength: number): string {
  const raw = Buffer.alloc(decodedByteLength, 1);
  return `data:image/png;base64,${raw.toString('base64')}`;
}

describe('assertProfileAvatar', () => {
  test('allows null and hsl colors', () => {
    expect(() => assertProfileAvatar(null)).not.toThrow();
    expect(() => assertProfileAvatar(undefined)).not.toThrow();
    expect(() => assertProfileAvatar('hsl(120, 70%, 40%)')).not.toThrow();
  });

  test('allows images at or under the limit', () => {
    // Decoded length must leave base64 padding estimate under the cap.
    const underLimit = PROFILE_AVATAR_MAX_BYTES - 16;
    expect(() => assertProfileAvatar(pngDataUrl(underLimit))).not.toThrow();
    expect(() => assertProfileAvatar(pngDataUrl(1024))).not.toThrow();
  });

  test('rejects images over the 8MB limit', () => {
    expect(() => assertProfileAvatar(pngDataUrl(PROFILE_AVATAR_MAX_BYTES + 1))).toThrow(
      AppError
    );
    try {
      assertProfileAvatar(pngDataUrl(PROFILE_AVATAR_MAX_BYTES + 1));
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).message).toBe(
        `Image size exceeds the ${PROFILE_AVATAR_MAX_MB}MB limit.`
      );
    }
  });

  test('rejects invalid avatar formats', () => {
    expect(() => assertProfileAvatar('not-an-avatar')).toThrow(AppError);
    expect(() => assertProfileAvatar('data:text/plain;base64,YQ==')).toThrow(AppError);
  });
});
