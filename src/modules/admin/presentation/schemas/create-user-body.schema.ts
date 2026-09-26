import { t } from 'elysia';
import { giftistryUserPolicySchema } from './giftistry-user-policy.schema';

export const createUserBodySchema = t.Object({
  Giftistry: t.Object({
    AdminUser: t.Object({
      Username: t.String({ minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_-]+$' }),
      Email: t.Optional(t.String()),
      Password: t.String({ minLength: 6 }),
      FirstName: t.Optional(t.String()),
      LastName: t.Optional(t.String()),
      IsAdmin: t.Optional(t.Boolean()),
      EmailVerified: t.Optional(t.Boolean()),
      ForcePasswordChange: t.Optional(t.Boolean()),
      Policy: t.Optional(giftistryUserPolicySchema),
    }),
  }),
});
