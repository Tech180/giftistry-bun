import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import { AppError } from '@/common/middlewares/error.middleware';

export async function assertOwnerCanEnableListAi(
  userId: string,
  userRepo: UserRepository,
  assertUserCan: AssertUserCanUseCase
): Promise<void> {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (user.AiEnabled === false) {
    throw new AppError('AI features are disabled on your profile', 403, 'FORBIDDEN');
  }

  await assertUserCan.execute(userId, 'CanUseAiFeatures');
}

export async function ownerPolicyAllowsAiExtraction(
  userId: string,
  userRepo: UserRepository,
  assertUserCan: AssertUserCanUseCase
): Promise<boolean> {
  try {
    await assertUserCan.execute(userId, 'CanUseAiFeatures');
    return true;
  } catch {
    return false;
  }
}
