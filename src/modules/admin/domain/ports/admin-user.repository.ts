import type {
  AdminUserDto,
  AdminUserRow,
  UserDeleteTarget,
  UserPolicyState,
} from '../admin-user.entity';
import type { GiftistryUserPolicy } from '@/common/types/user-policy';

export interface AdminUserListFilters {
  search?: string;
  disabled?: boolean | null;
  locked?: boolean;
  adminOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminUserListResult {
  users: AdminUserDto[];
  page: number;
  total: number;
}

export interface AdminUserActivityEntry {
  Action: string;
  CreatedAt: Date | string;
  Metadata?: unknown;
}

export interface AdminUserDetailResult {
  user: AdminUserDto & {
    FriendsCount: number;
    CommentsCount: number;
    PasskeyCount: number;
  };
  activity: AdminUserActivityEntry[];
}

export interface CreateAdminUserInput {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  emailVerified?: boolean;
  forcePasswordChange?: boolean;
  policy: GiftistryUserPolicy;
}

export interface UpdateAdminUserInput {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string | null;
  emailVerified?: boolean;
}

export interface AdminUserProfileState {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio: string | null;
  avatar: string | null;
  email_verified: boolean;
}

export interface OverviewUserStats {
  total: number;
  active: number;
  disabled: number;
  unverified: number;
  admins: number;
  new_30d: number;
  active_7d: number;
  locked: number;
}

export interface OverviewListStats {
  total: number;
  active: number;
}

export interface AdminUserRepository {
  countEnabledAdmins(excludeUserId?: string): Promise<number>;
  list(filters: AdminUserListFilters): Promise<AdminUserListResult>;
  findByIdWithDetails(id: string): Promise<AdminUserDetailResult | null>;
  existsByUsernameOrEmail(username: string, email: string): Promise<boolean>;
  existsByEmail(email: string, excludeId: string): Promise<boolean>;
  existsByUsername(username: string, excludeId: string): Promise<boolean>;
  create(input: CreateAdminUserInput, authHash: string, avatar: string): Promise<string>;
  getProfileState(id: string): Promise<AdminUserProfileState | null>;
  updateProfile(id: string, updates: UpdateAdminUserInput, current: AdminUserProfileState): Promise<void>;
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
