import type { UserPolicyContext } from '../user-policy.vo';

export interface UserPolicyRepository {
  getContext(userId: string): Promise<UserPolicyContext | null>;
  countActiveWishlists(userId: string): Promise<number>;
}
