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

  test('active list with past expiry is archived', async () => {
    const expiredActive = [
      list({
        Id: 'exp-1',
        Title: 'Expired Active',
        Role: 'owner',
        IsActive: true,
        ExpiresAt: new Date(Date.now() - 86400000),
      }),
    ];
    const uc = new ListWishlistsUseCase({
      findByUserId: mock(async () => expiredActive),
    } as never);
    const archive = await uc.execute('user-1', { bucket: 'archive' });
    const my = await uc.execute('user-1', { bucket: 'my' });
    expect(archive.Wishlists.map((w) => w.Id)).toEqual(['exp-1']);
    expect(my.Wishlists).toEqual([]);
  });

  test('active list with null expiry is in my bucket', async () => {
    const active = [list({ Id: 'my-1', Title: 'Live', Role: 'owner', IsActive: true, ExpiresAt: null })];
    const uc = new ListWishlistsUseCase({
      findByUserId: mock(async () => active),
    } as never);
    const my = await uc.execute('user-1', { bucket: 'my' });
    const archive = await uc.execute('user-1', { bucket: 'archive' });
    expect(my.Wishlists.map((w) => w.Id)).toEqual(['my-1']);
    expect(archive.Wishlists).toEqual([]);
  });

  test('inactive list with future expiry is archived', async () => {
    const inactive = [
      list({
        Id: 'ina-1',
        Title: 'Manual Archive',
        Role: 'owner',
        IsActive: false,
        ExpiresAt: new Date(Date.now() + 86400000),
      }),
    ];
    const uc = new ListWishlistsUseCase({
      findByUserId: mock(async () => inactive),
    } as never);
    const archive = await uc.execute('user-1', { bucket: 'archive' });
    expect(archive.Wishlists.map((w) => w.Id)).toEqual(['ina-1']);
  });

  test('reactivated fields (active + cleared expiry) land in my bucket', async () => {
    const restored = [
      list({
        Id: 'rest-1',
        Title: 'Restored',
        Role: 'owner',
        IsActive: true,
        ExpiresAt: null,
      }),
    ];
    const uc = new ListWishlistsUseCase({
      findByUserId: mock(async () => restored),
    } as never);
    const my = await uc.execute('user-1', { bucket: 'my' });
    const archive = await uc.execute('user-1', { bucket: 'archive' });
    expect(my.Wishlists.map((w) => w.Id)).toEqual(['rest-1']);
    expect(archive.Wishlists).toEqual([]);
  });
});
