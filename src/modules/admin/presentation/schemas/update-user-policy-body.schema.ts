import { t } from 'elysia';
import { giftistryUserPolicySchema } from './giftistry-user-policy.schema';

export const updateUserPolicyBodySchema = t.Object({
  Giftistry: t.Object({
    Policy: t.Object({
      IsAdmin: t.Optional(t.Boolean()),
      IsDisabled: t.Optional(t.Boolean()),
      IsHidden: t.Optional(t.Boolean()),
      ForcePasswordChange: t.Optional(t.Boolean()),
      LoginAttemptsBeforeLockout: t.Optional(t.Number()),
      Policy: t.Optional(giftistryUserPolicySchema),
    }),
  }),
});
