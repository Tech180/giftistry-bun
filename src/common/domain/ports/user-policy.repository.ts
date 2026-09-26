import type { UserPolicyContext } from '../interfaces/user-policy-context.interface';

export interface UserPolicyRepository {
  getContext(userId: string): Promise<UserPolicyContext | null>;
  countActiveWishlists(userId: string): Promise<number>;
}
