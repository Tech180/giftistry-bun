import type { UserRepository } from '../domain/ports/user.repository';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import { isOwnerOnboardingCompleted } from '@/modules/system/domain/owner-onboarding.util';

export interface OnboardingState {
  IsOnboarded: boolean;
  OwnerOnboardingCompleted: boolean;
  RequiresOwnerOnboarding: boolean;
  IsAdmin: boolean;
  UserSteps: string[];
  OwnerSteps: string[];
}

const USER_STEPS = ['hello', 'theme', 'profile'] as const;
const OWNER_STEPS = ['public_url', 'registration', 'mail', 'ai'] as const;

export class GetOnboardingStateUseCase {
  constructor(
    private userRepo: UserRepository,
    private serverConfigRepo: ServerConfigRepository
  ) {}

  async execute(userId: string): Promise<OnboardingState> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const config = this.serverConfigRepo.load();
    const ownerOnboardingCompleted = isOwnerOnboardingCompleted(config);
    const requiresOwnerOnboarding = !!user.IsOwner && !ownerOnboardingCompleted;

    return {
      IsOnboarded: user.IsOnboarded === true,
      OwnerOnboardingCompleted: ownerOnboardingCompleted,
      RequiresOwnerOnboarding: requiresOwnerOnboarding,
      IsAdmin: !!user.IsAdmin,
      UserSteps: [...USER_STEPS],
      OwnerSteps: requiresOwnerOnboarding ? [...OWNER_STEPS] : [],
    };
  }
}
