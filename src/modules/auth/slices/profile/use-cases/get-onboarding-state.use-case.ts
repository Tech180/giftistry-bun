import type { UserRepository } from '../../../domain/ports/user.repository';
import type { ServerConfigRepository } from '@/modules/system';
import { isOwnerOnboardingCompleted } from '@/modules/system';
import { ONBOARDING_OWNER_STEPS, ONBOARDING_USER_STEPS } from '../constants/onboarding-steps.constant';
import type { OnboardingState } from '../interfaces/onboarding-state.interface';

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
      UserSteps: [...ONBOARDING_USER_STEPS],
      OwnerSteps: requiresOwnerOnboarding ? [...ONBOARDING_OWNER_STEPS] : [],
    };
  }
}
