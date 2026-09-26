import type { GiftistryUserPolicy } from './interfaces/giftistry-user-policy.interface';
import { parseJsonValue } from '@/common/utils/parse-json-field.util';
import { mergeUserPolicy } from './utils/merge-user-policy.util';
import type { UserPolicyContext } from './interfaces/user-policy-context.interface';

export class UserPolicyVO {
  constructor(readonly context: UserPolicyContext) {}

  isAdmin(): boolean {
    return Boolean(this.context.IsAdmin);
  }

  isDisabled(): boolean {
    return Boolean(this.context.IsDisabled);
  }

  isLocked(): boolean {
    return Boolean(this.context.LockedUntil && this.context.LockedUntil > new Date());
  }

  can(permission: keyof GiftistryUserPolicy): boolean {
    if (this.isAdmin()) {
      return true;
    }
    const value = this.context.Policy[permission];
    return typeof value !== 'boolean' || value;
  }

  canCreateWishlist(currentCount: number): boolean {
    if (this.isAdmin()) {
      return true;
    }
    const max = this.context.Policy.MaxActiveWishlists;
    if (!max) {
      return true;
    }
    return currentCount < max;
  }

  static fromRaw(row: {
    Id: string;
    IsAdmin?: boolean;
    IsDisabled?: boolean;
    IsHidden?: boolean;
    LockedUntil?: Date | null;
    PolicyJson?: unknown;
  }): UserPolicyVO {
    const policy = mergeUserPolicy(parseJsonValue(row.PolicyJson));
    return new UserPolicyVO({
      Id: row.Id,
      IsAdmin: row.IsAdmin,
      IsDisabled: row.IsDisabled,
      IsHidden: row.IsHidden,
      LockedUntil: row.LockedUntil ? new Date(row.LockedUntil) : null,
      Policy: policy,
    });
  }
}
