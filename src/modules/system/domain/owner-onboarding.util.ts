import type { ServerConfig } from './server-config.entity';

/** True when owner onboarding is done, including legacy AdminOnboardingCompleted. */
export function isOwnerOnboardingCompleted(
  config: Pick<ServerConfig, 'OwnerOnboardingCompleted' | 'AdminOnboardingCompleted'>
): boolean {
  return config.OwnerOnboardingCompleted === true || config.AdminOnboardingCompleted === true;
}
