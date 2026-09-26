import { t } from 'elysia';

export const signupBodySchema = t.Object({
  Giftistry: t.Object({
    Auth: t.Object({
      Username: t.String({ minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_-]+$' }),
      Email: t.Optional(t.Union([t.String({ format: 'email' }), t.Literal('')])),
      FirstName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
      LastName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
      Password: t.String({ minLength: 6 }),
      InviteToken: t.Optional(t.Nullable(t.String())),
    }),
  }),
});
