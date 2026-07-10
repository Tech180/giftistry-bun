import type { UserRepository } from '../domain/ports/user.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';

export class UserPreviewUseCase {
  constructor(
    private userRepo: UserRepository,
    private wishlistRepo: WishlistRepository
  ) {}

  async execute(userId: string, viewerId?: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) return null;

    if (user.IsDisabled) {
      return {
        Id: user.Id,
        Username: user.Username,
        FirstName: user.FirstName,
        LastName: user.LastName,
        Avatar: user.Avatar || null,
        IsDisabled: true,
      };
    }

    const { active: activeListsCount, archived: archivedListsCount } =
      await this.wishlistRepo.countListsByUser(userId);

    let mutualsCount = 0;
    if (viewerId && viewerId !== userId) {
      mutualsCount = await this.userRepo.countMutualFriends(viewerId, userId);
    }

    return {
      Id: user.Id,
      Username: user.Username,
      FirstName: user.FirstName,
      LastName: user.LastName,
      Bio: user.Bio || '',
      Theme: user.Theme || 'default',
      Avatar: user.Avatar || null,
      Birthday: user.Birthday || null,
      WishlistCount: activeListsCount,
      ActiveListsCount: activeListsCount,
      ArchivedListsCount: archivedListsCount,
      MutualsCount: mutualsCount,
      CreatedAt: user.CreatedAt,
      LastOnline: user.LastOnline || null,
    };
  }
}
