import { describe, expect, test } from 'bun:test';
import { mergeSitePolicy, mergeUserPolicy } from '@/common/types/user-policy';

describe('mergeUserPolicy', () => {
  test('reads PascalCase keys', () => {
    expect(
      mergeUserPolicy({
        CanCreateWishlists: false,
        MaxActiveWishlists: 3,
        CanUseComments: false,
        CanUseAiFeatures: false,
        CanSharePublicLinks: false,
        CanUploadImages: false,
        CanSendFriendRequests: false,
        CanUseCustomThemes: false,
      })
    ).toEqual({
      CanCreateWishlists: false,
      MaxActiveWishlists: 3,
      CanUseComments: false,
      CanUseAiFeatures: false,
      CanSharePublicLinks: false,
      CanUploadImages: false,
      CanSendFriendRequests: false,
      CanUseCustomThemes: false,
    });
  });

  test('fills defaults for missing keys', () => {
    expect(mergeUserPolicy({ CanCreateWishlists: false, MaxActiveWishlists: 2 })).toMatchObject({
      CanCreateWishlists: false,
      MaxActiveWishlists: 2,
      CanUseComments: true,
    });
  });
});

describe('mergeSitePolicy', () => {
  test('reads PascalCase keys including nested DefaultUserPolicy', () => {
    const merged = mergeSitePolicy({
      RegistrationMode: 'invite_only',
      RequireEmailVerification: true,
      LoginAttemptsBeforeLockout: 7,
      LockoutDurationMinutes: 15,
      MaintenanceMode: true,
      MaintenanceMessage: 'Down',
      AllowPasswordLogin: false,
      RequireStrongPasswords: false,
      AllowedEmailDomains: ['example.com'],
      DefaultUserPolicy: {
        CanCreateWishlists: false,
        MaxActiveWishlists: 1,
      },
    });

    expect(merged).toMatchObject({
      RegistrationMode: 'invite_only',
      RequireEmailVerification: true,
      LoginAttemptsBeforeLockout: 7,
      LockoutDurationMinutes: 15,
      MaintenanceMode: true,
      MaintenanceMessage: 'Down',
      AllowPasswordLogin: false,
      RequireStrongPasswords: false,
      AllowedEmailDomains: ['example.com'],
      DefaultUserPolicy: {
        CanCreateWishlists: false,
        MaxActiveWishlists: 1,
      },
    });
  });

  test('defaults RequireStrongPasswords to true', () => {
    expect(mergeSitePolicy({}).RequireStrongPasswords).toBe(true);
  });
});
