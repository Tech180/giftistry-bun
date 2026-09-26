import type { GiftistryUserPolicy } from '@/common/domain/interfaces/giftistry-user-policy.interface';
import type { UserListFilters } from '../interfaces/user-list-filters.interface';
import type { UserListResult } from '../interfaces/user-list-result.interface';
import type { UserDetailResult } from '../interfaces/user-detail-result.interface';
import type { CreateUserInput } from '../interfaces/create-user-input.interface';
import type { UpdateUserInput } from '../interfaces/update-user-input.interface';
import type { UserProfileState } from '../interfaces/user-profile-state.interface';
import type { UserPolicyState } from '../interfaces/user-policy-state.interface';
import type { UserDeleteTarget } from '../interfaces/user-delete-target.interface';
import type { OverviewUserStats } from '../interfaces/overview-user-stats.interface';
import type { OverviewListStats } from '../interfaces/overview-list-stats.interface';

export interface UserRepository {
  countEnabledAdmins(excludeUserId?: string): Promise<number>;
  list(filters: UserListFilters): Promise<UserListResult>;
  findByIdWithDetails(id: string): Promise<UserDetailResult | null>;
  existsByUsernameOrEmail(username: string, email: string | null): Promise<boolean>;
  existsByEmail(email: string, excludeId: string): Promise<boolean>;
  existsByUsername(username: string, excludeId: string): Promise<boolean>;
  create(input: CreateUserInput, authHash: string, avatar: string): Promise<string>;
  getProfileState(id: string): Promise<UserProfileState | null>;
  updateProfile(id: string, updates: UpdateUserInput, current: UserProfileState): Promise<void>;
  getPolicyState(id: string): Promise<UserPolicyState | null>;
  updatePolicy(
    id: string,
    nextIsAdmin: boolean,
    nextIsDisabled: boolean,
    nextIsHidden: boolean,
    nextLockout: number,
    nextForcePw: boolean,
    mergedPolicy: GiftistryUserPolicy
  ): Promise<void>;
  exists(id: string): Promise<boolean>;
  resetPassword(id: string, authHash: string, forcePasswordChange: boolean): Promise<void>;
  unlock(id: string): Promise<void>;
  revokeSessions(id: string): Promise<void>;
  getDeleteTarget(id: string): Promise<UserDeleteTarget | null>;
  delete(id: string): Promise<void>;
  getOverviewUserStats(): Promise<OverviewUserStats>;
  getOverviewListStats(): Promise<OverviewListStats>;
  getOverviewCommentCount(): Promise<number>;
}
