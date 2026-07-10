import type { UserPolicyRepository } from '@/common/domain/ports/user-policy.repository';
import type { UserPolicyContext } from '@/common/domain/user-policy.vo';
import { UserPolicyVO } from '@/common/domain/user-policy.vo';
import { AppError } from '@/common/middlewares/error.middleware';
import type { GiftistryUserPolicy } from '@/common/types/user-policy';

export class GetUserPolicyContextUseCase {
  constructor(private userPolicyRepo: UserPolicyRepository) {}

  async execute(userId: string): Promise<UserPolicyContext | null> {
    return this.userPolicyRepo.getContext(userId);
  }
}

export class AssertUserCanUseCase {
  constructor(private userPolicyRepo: UserPolicyRepository) {}

  async execute(
    userId: string,
    permission: keyof GiftistryUserPolicy
  ): Promise<UserPolicyContext> {
    const ctx = await this.userPolicyRepo.getContext(userId);
    if (!ctx) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const policy = new UserPolicyVO(ctx);
    if (policy.isAdmin()) return ctx;
    if (policy.isDisabled()) {
      throw new AppError('Your account has been disabled', 403, 'FORBIDDEN');
    }
    if (policy.isLocked()) {
      throw new AppError('Your account is temporarily locked', 403, 'FORBIDDEN');
    }
    if (!policy.can(permission)) {
      throw new AppError('This action is not permitted for your account', 403, 'FORBIDDEN');
    }

    return ctx;
  }
}

export class AssertCanCreateWishlistUseCase {
  constructor(private userPolicyRepo: UserPolicyRepository) {}

  async execute(userId: string): Promise<void> {
    const ctx = await this.userPolicyRepo.getContext(userId);
    if (!ctx) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const policy = new UserPolicyVO(ctx);
    if (policy.isAdmin()) return;

    if (policy.isDisabled()) {
      throw new AppError('Your account has been disabled', 403, 'FORBIDDEN');
    }
    if (policy.isLocked()) {
      throw new AppError('Your account is temporarily locked', 403, 'FORBIDDEN');
    }
    if (!policy.can('canCreateWishlists')) {
      throw new AppError('This action is not permitted for your account', 403, 'FORBIDDEN');
    }

    const count = await this.userPolicyRepo.countActiveWishlists(userId);
    if (!policy.canCreateWishlist(count)) {
      throw new AppError('You have reached the maximum number of active wishlists', 403, 'FORBIDDEN');
    }
  }
}
