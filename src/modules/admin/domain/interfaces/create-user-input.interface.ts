import type { GiftistryUserPolicy } from '@/common/domain/interfaces/giftistry-user-policy.interface';

export interface CreateUserInput {
  username: string;
  email: string | null;
  password: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  emailVerified?: boolean;
  forcePasswordChange?: boolean;
  policy: GiftistryUserPolicy;
}
