import { describe, expect, test } from 'bun:test';
import { pascalizeItemDescriptionJson, pascalizeSitePolicyObject, pascalizeNotificationMetadata } from '@/common/database/pascalize-data.migration';

describe('pascalizeItemDescriptionJson', () => {
  test('rewrites camelCase description to PascalCase', () => {
    const input = JSON.stringify({
      text: 'Notes',
      isFavorite: true,
      multiCount: true,
      desiredQuantity: 2,
      otherUsersCanSee: false,
      variations: [{ name: 'Red', quantity: 1 }],
      pantsSize: '32x30',
      custom: [{ name: 'Fit', value: 'Slim' }],
    });
    const next = pascalizeItemDescriptionJson(input);
    expect(JSON.parse(next!)).toEqual({
      Text: 'Notes',
      CustomFields: {
        Predefined: { PantsSize: '32x30' },
        UserDefined: { Fit: 'Slim' },
      },
      IsFavorite: true,
      MultiCount: true,
      DesiredQuantity: 2,
      OtherUsersCanSee: false,
      Variations: [{ Name: 'Red', Quantity: 1 }],
    });
  });

  test('returns null when already PascalCase', () => {
    const input = JSON.stringify({
      Text: 'Notes',
      CustomFields: { Predefined: {}, UserDefined: {} },
      IsFavorite: true,
    });
    expect(pascalizeItemDescriptionJson(input)).toBeNull();
  });
});

describe('pascalizeSitePolicyObject', () => {
  test('rewrites nested policy keys', () => {
    expect(
      pascalizeSitePolicyObject({
        registrationMode: 'open',
        defaultUserPolicy: { canCreateWishlists: false },
      })
    ).toEqual({
      RegistrationMode: 'open',
      DefaultUserPolicy: { CanCreateWishlists: false },
    });
  });
});

describe('pascalizeNotificationMetadata', () => {
  test('rewrites camel metadata keys', () => {
    expect(pascalizeNotificationMetadata({ requestId: '1', listId: '2' })).toEqual({
      RequestId: '1',
      ListId: '2',
    });
  });
});
