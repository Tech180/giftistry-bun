import type { OnboardingRequest } from '../interfaces/onboarding-request.interface';
import type { PatchTutorialRequest } from '../interfaces/patch-tutorial-request.interface';

export function mapOnboardingProfilePayload(payload: OnboardingRequest) {
  return {
    username: payload.Username,
    firstName: payload.FirstName ?? undefined,
    lastName: payload.LastName ?? undefined,
    bio: payload.Bio ?? undefined,
    theme: payload.Theme ?? undefined,
  };
}

export function mapCompleteOwnerOnboardingPayload(payload: OnboardingRequest) {
  return {
    Skip: payload.SkipOwner === true,
    PublicAppUrl: payload.PublicAppUrl,
    RegistrationMode: payload.RegistrationMode,
    SmtpType: payload.SmtpType,
    SmtpHost: payload.SmtpHost,
    SmtpPort: payload.SmtpPort,
    SmtpUser: payload.SmtpUser,
    SmtpPass: payload.SmtpPass,
    SmtpSecure: payload.SmtpSecure,
    SmtpFrom: payload.SmtpFrom,
    AiEnabled: payload.AiEnabled,
    AiWebSearchEnabled: payload.AiWebSearchEnabled,
  };
}

export function mapPatchTutorialPayload(payload: PatchTutorialRequest) {
  return {
    FirstRunDismissed: payload.FirstRunDismissed,
    CompleteChapter: payload.CompleteChapter,
    SkipChapter: payload.SkipChapter,
    ResetChapter: payload.ResetChapter,
    ResetAll: payload.ResetAll,
  };
}
