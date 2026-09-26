import type { ServerConfig } from '../interfaces/server-config.interface';

/** True when owner onboarding is done, including legacy AdminOnboardingCompleted. */
export function isOwnerOnboardingCompleted(
  config: Pick<ServerConfig, 'OwnerOnboardingCompleted' | 'AdminOnboardingCompleted'>
): boolean {
  return config.OwnerOnboardingCompleted === true || config.AdminOnboardingCompleted === true;
}
