import type { GiftistryUserPolicy } from '@/common/types/user-policy';
import { mergeUserPolicy } from '@/common/types/user-policy';

export interface UserPolicyContext {
  Id: string;
  IsAdmin?: boolean;
  IsDisabled?: boolean;
  IsHidden?: boolean;
  LockedUntil?: Date | null;
  Policy: GiftistryUserPolicy;
}

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
    if (this.isAdmin()) return true;
    const value = this.context.Policy[permission];
    return typeof value !== 'boolean' || value;
  }

  canCreateWishlist(currentCount: number): boolean {
    if (this.isAdmin()) return true;
    const max = this.context.Policy.maxActiveWishlists;
    if (!max) return true;
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
    const policy = mergeUserPolicy(
      typeof row.PolicyJson === 'string' ? JSON.parse(row.PolicyJson) : row.PolicyJson
    );
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
