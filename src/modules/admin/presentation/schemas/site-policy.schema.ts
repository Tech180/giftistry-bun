import { t } from 'elysia';
import { giftistryUserPolicySchema } from './giftistry-user-policy.schema';

export const sitePolicySchema = t.Object({
  RegistrationMode: t.Optional(t.Union([
    t.Literal('open'),
    t.Literal('invite_only'),
    t.Literal('disabled'),
  ])),
  RequireEmailVerification: t.Optional(t.Boolean()),
  LoginAttemptsBeforeLockout: t.Optional(t.Number()),
  LockoutDurationMinutes: t.Optional(t.Number()),
  MaintenanceMode: t.Optional(t.Boolean()),
  MaintenanceMessage: t.Optional(t.String()),
  AllowPasswordLogin: t.Optional(t.Boolean()),
  RequireStrongPasswords: t.Optional(t.Boolean()),
  AllowedEmailDomains: t.Optional(t.Array(t.String())),
  RegistrationInviteTtlHours: t.Optional(t.Number()),
  RegistrationInviteMaxUses: t.Optional(t.Union([t.Number(), t.Null()])),
  DefaultUserPolicy: t.Optional(giftistryUserPolicySchema),
});
