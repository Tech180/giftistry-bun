import { describe, expect, test, mock } from 'bun:test';
import { ListWishlistsUseCase } from '../src/modules/wishlist/application/list-wishlists.use-case';
import type { Wishlist } from '../src/modules/wishlist/domain/wishlist.entity';

function list(partial: Partial<Wishlist> & Pick<Wishlist, 'Id' | 'Title' | 'Role'>): Wishlist {
  return {
    UserId: 'owner-1',
    ExpiresAt: null,
    AllowGroupFunds: false,
    IsActive: true,
    CreatedAt: new Date(),
    Category: 'generic',
    OwnerFirstName: 'Ada',
    ...partial,
  };
}

describe('ListWishlistsUseCase buckets and search', () => {
  const wishlists: Wishlist[] = [
    list({ Id: '1', Title: 'My Active', Role: 'owner' }),
    list({ Id: '2', Title: 'Shared Party', Role: 'viewer', OwnerFirstName: 'Bob' }),
    list({
      Id: '3',
      Title: 'Old List',
      Role: 'owner',
      ExpiresAt: new Date(Date.now() - 86400000),
    }),
  ];

  const useCase = new ListWishlistsUseCase({
    findByUserId: mock(async () => wishlists),
  } as never);

  test('returns counts for all buckets and filters by bucket', async () => {
    const result = await useCase.execute('user-1', { bucket: 'shared' });
    expect(result.Counts).toEqual({ My: 1, Shared: 1, Archive: 1 });
    expect(result.Wishlists.map((w) => w.Id)).toEqual(['2']);
  });

  test('applies case-insensitive search within the selected bucket', async () => {
    const result = await useCase.execute('user-1', { bucket: 'all', q: 'party' });
    expect(result.Wishlists.map((w) => w.Id)).toEqual(['2']);
    expect(result.Counts.My).toBe(1);
  });
});
