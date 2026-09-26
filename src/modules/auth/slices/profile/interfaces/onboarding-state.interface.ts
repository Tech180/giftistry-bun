export interface OnboardingState {
  IsOnboarded: boolean;
  OwnerOnboardingCompleted: boolean;
  RequiresOwnerOnboarding: boolean;
  IsAdmin: boolean;
  UserSteps: string[];
  OwnerSteps: string[];
}
