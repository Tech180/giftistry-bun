import type { SystemConfig } from '@/common/database/connection';
import { AppError } from '@/common/middlewares/error.middleware';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { User } from '@/modules/auth/domain/user.entity';
import type { Wishlist } from '@/modules/wishlist/domain/wishlist.entity';

export type WebSearchServerConfig = Pick<SystemConfig, 'AiEnabled' | 'AiWebSearchEnabled'>;

export function serverAllowsWebSearch(config: WebSearchServerConfig): boolean {
  return Boolean(config.AiEnabled && config.AiWebSearchEnabled);
}

export function userAllowsWebSearchProfile(user: Pick<User, 'AiEnabled' | 'WebSearchEnabled'> | null): boolean {
  if (!user || user.AiEnabled === false) return false;
  return user.WebSearchEnabled !== false;
}

export function wishlistAllowsWebSearch(wishlist: Pick<Wishlist, 'AiEnabled' | 'WebSearchEnabled'> | null): boolean {
  if (!wishlist || !wishlist.AiEnabled) return false;
  return Boolean(wishlist.WebSearchEnabled);
}

export async function assertOwnerCanEnableListWebSearch(
  userId: string,
  userRepo: UserRepository,
  assertUserCan: AssertUserCanUseCase,
  config: WebSearchServerConfig
): Promise<void> {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (user.AiEnabled === false) {
    throw new AppError('AI features are disabled on your profile', 403, 'FORBIDDEN');
  }

  if (user.WebSearchEnabled === false) {
    throw new AppError('Web search is disabled on your profile', 403, 'FORBIDDEN');
  }

  if (!serverAllowsWebSearch(config)) {
    throw new AppError('Web search is disabled on this server', 403, 'FORBIDDEN');
  }

  await assertUserCan.execute(userId, 'CanUseAiFeatures');
}

export async function resolveWebSearchForExtract(
  userId: string,
  listId: string | undefined,
  userRepo: UserRepository,
  wishlistRepo: WishlistRepository,
  assertUserCan: AssertUserCanUseCase,
  config: WebSearchServerConfig
): Promise<boolean> {
  if (!serverAllowsWebSearch(config)) return false;

  const user = await userRepo.findById(userId);
  if (!userAllowsWebSearchProfile(user)) return false;

  try {
    await assertUserCan.execute(userId, 'CanUseAiFeatures');
  } catch {
    return false;
  }

  if (!listId?.trim()) return false;

  const wishlist = await wishlistRepo.findById(listId);
  return wishlistAllowsWebSearch(wishlist);
}
