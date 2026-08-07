import { AppError } from '@/common/middlewares/error.middleware';

/** Non-owners cannot mutate the server owner's account. Owner may still act on self. */
export function assertCanMutateAdminUser(
  actorId: string,
  targetId: string,
  targetIsOwner: boolean
): void {
  if (targetIsOwner && actorId !== targetId) {
    throw new AppError('Cannot modify the server owner', 403, 'FORBIDDEN');
  }
}
