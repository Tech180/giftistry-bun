import { DomainError } from '@/common/domain/errors/domain-error';
import type { GiftistryUserPolicy } from '@/common/domain/interfaces/giftistry-user-policy.interface';
import { mergeUserPolicy } from '@/common/domain/utils/merge-user-policy.util';
import type { AuthUser } from './interfaces/auth-user.interface';
import type { UserDeleteTarget } from './interfaces/user-delete-target.interface';
import type { UserPolicyState } from './interfaces/user-policy-state.interface';
import type { UserPolicyUpdatePayload } from './interfaces/user-policy-update-payload.interface';

export class AdminUser {
  static assertAdmin(user: AuthUser): void {
    if (!user.IsAdmin) {
      throw new DomainError('Forbidden: Admin access required', 'FORBIDDEN');
    }
  }

  static resolvePolicyUpdate(
    actorId: string,
    target: UserPolicyState,
    payload: UserPolicyUpdatePayload,
    otherEnabledAdmins: number
  ): {
    nextIsAdmin: boolean;
    nextIsDisabled: boolean;
    nextIsHidden: boolean;
    nextLockout: number;
    nextForcePw: boolean;
    mergedPolicy: GiftistryUserPolicy;
  } {
    const isSelf = actorId === target.id;
    const nextIsAdmin = payload.isAdmin !== undefined ? !!payload.isAdmin : target.isAdmin;
    const nextIsDisabled = payload.isDisabled !== undefined ? !!payload.isDisabled : target.isDisabled;
    const nextIsHidden = payload.isHidden !== undefined ? !!payload.isHidden : target.isHidden;
    const nextLockout = payload.loginAttemptsBeforeLockout !== undefined
      ? payload.loginAttemptsBeforeLockout
      : target.loginAttemptsBeforeLockout;
    const nextForcePw = payload.forcePasswordChange !== undefined
      ? !!payload.forcePasswordChange
      : target.forcePasswordChange;

    if (isSelf && payload.isAdmin === false) {
      throw new DomainError('You cannot remove your own administrator privileges', 'BAD_REQUEST');
    }
    if (isSelf && payload.isDisabled === true) {
      throw new DomainError('You cannot disable your own account', 'BAD_REQUEST');
    }

    if (target.isAdmin && !nextIsAdmin && otherEnabledAdmins === 0) {
      throw new DomainError('Cannot remove the last administrator', 'BAD_REQUEST');
    }

    if (target.isAdmin && nextIsDisabled && otherEnabledAdmins === 0) {
      throw new DomainError('Cannot disable the last administrator', 'BAD_REQUEST');
    }

    const mergedPolicy = mergeUserPolicy({
      ...mergeUserPolicy(target.policyJson),
      ...(payload.policy ?? {}),
    });

    return {
      nextIsAdmin,
      nextIsDisabled,
      nextIsHidden,
      nextLockout,
      nextForcePw,
      mergedPolicy,
    };
  }

  /** Non-owners cannot mutate the server owner's account. Owner may still act on self. */
  static assertCanMutate(actorId: string, targetId: string, targetIsOwner: boolean): void {
    if (targetIsOwner && actorId !== targetId) {
      throw new DomainError('Cannot modify the server owner', 'FORBIDDEN');
    }
  }

  static assertCanDelete(actorId: string, target: UserDeleteTarget, otherEnabledAdmins: number): void {
    if (actorId === target.id) {
      throw new DomainError('You cannot delete your own account from admin panel', 'BAD_REQUEST');
    }

    if (target.isOwner) {
      throw new DomainError('Cannot delete the server owner. Transfer ownership or delete the server.', 'BAD_REQUEST');
    }

    if (target.isAdmin && !target.isDisabled && otherEnabledAdmins === 0) {
      throw new DomainError('Cannot delete the last administrator', 'BAD_REQUEST');
    }
  }
}
