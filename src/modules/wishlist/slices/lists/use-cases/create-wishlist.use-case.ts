import type { WishlistRepository } from '../../../domain/ports/wishlist.repository';
import type { UserRepository } from '@/modules/auth';
import type { Wishlist } from '../../../domain/interfaces/wishlist.interface';
import type { ServerConfigRepository } from '@/modules/system';
import { AppError } from '@/common/domain/errors/app-error';
import type { AssertCanCreateWishlistUseCase, AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import { assertOwnerCanEnableListAi } from '@/common/application/utils/user-ai-access.util';
import {
  assertOwnerCanEnableListWebSearch,
  serverAllowsWebSearch,
} from '@/common/application/utils/user-web-search-access.util';

export class CreateWishlistUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private userRepo: UserRepository,
    private assertCanCreateWishlist: AssertCanCreateWishlistUseCase,
    private assertUserCan: AssertUserCanUseCase,
    private configRepo: ServerConfigRepository
  ) {}

  async execute(
    userId: string,
    title: string,
    expiresAtStr?: string | null,
    allowGroupFunds: boolean = false,
    category?: string,
    revealSuggestions: boolean = true,
    aiEnabled?: boolean,
    webSearchEnabled?: boolean,
    manualJobBackground?: boolean,
    autoRollover?: boolean
  ): Promise<Wishlist> {
    if (!title) {
      throw new AppError('Wishlist title is required', 400, 'BAD_REQUEST');
    }

    await this.assertCanCreateWishlist.execute(userId);

    const config = this.configRepo.load();
    let resolvedAi = aiEnabled;
    if (resolvedAi === undefined) {
      if (config.AiEnabled) {
        try {
          await assertOwnerCanEnableListAi(userId, this.userRepo, this.assertUserCan);
          resolvedAi = true;
        } catch {
          resolvedAi = false;
        }
      } else {
        resolvedAi = false;
      }
    } else if (resolvedAi) {
      await assertOwnerCanEnableListAi(userId, this.userRepo, this.assertUserCan);
    }

    let resolvedWeb = webSearchEnabled;
    if (resolvedWeb === undefined) {
      if (resolvedAi && serverAllowsWebSearch(config)) {
        try {
          await assertOwnerCanEnableListWebSearch(userId, this.userRepo, this.assertUserCan, config);
          resolvedWeb = true;
        } catch {
          resolvedWeb = false;
        }
      } else {
        resolvedWeb = false;
      }
    } else if (resolvedWeb) {
      await assertOwnerCanEnableListWebSearch(userId, this.userRepo, this.assertUserCan, config);
    }

    if (!resolvedAi) {
      resolvedWeb = false;
    }

    const resolvedManualBackground = manualJobBackground !== false;
    const resolvedAutoRollover = autoRollover === true;

    let expiresAt: Date | null = null;
    if (expiresAtStr) {
      expiresAt = new Date(expiresAtStr);
      if (isNaN(expiresAt.getTime())) {
        throw new AppError('Invalid expiration date format', 400, 'BAD_REQUEST');
      }
    }

    return await this.wishlistRepo.create(
      userId,
      title,
      expiresAt,
      allowGroupFunds,
      category,
      revealSuggestions,
      resolvedAi,
      resolvedWeb,
      resolvedManualBackground,
      resolvedAutoRollover
    );
  }
}
