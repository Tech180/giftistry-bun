import { describe, expect, test } from 'bun:test';
import { isOwnerOnboardingCompleted } from '@/modules/system/domain/owner-onboarding.util';

describe('isOwnerOnboardingCompleted', () => {
  test('true when OwnerOnboardingCompleted is set', () => {
    expect(isOwnerOnboardingCompleted({ OwnerOnboardingCompleted: true })).toBe(true);
  });

  test('true when legacy AdminOnboardingCompleted is set', () => {
    expect(isOwnerOnboardingCompleted({ AdminOnboardingCompleted: true })).toBe(true);
  });

  test('false when neither flag is set', () => {
    expect(isOwnerOnboardingCompleted({})).toBe(false);
    expect(
      isOwnerOnboardingCompleted({
        OwnerOnboardingCompleted: false,
        AdminOnboardingCompleted: false,
      })
    ).toBe(false);
  });
});
