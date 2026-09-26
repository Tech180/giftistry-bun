import { t } from 'elysia';

export const setupBodySchema = t.Object({
  Giftistry: t.Object({
    Setup: t.Object({
      SetupToken: t.Optional(t.String()),
      DbType: t.String(),
      DbUrl: t.Optional(t.String()),
      SmtpType: t.Optional(t.String()),
      SmtpHost: t.Optional(t.String()),
      SmtpPort: t.Optional(t.Numeric()),
      SmtpUser: t.Optional(t.String()),
      SmtpPass: t.Optional(t.String()),
      SmtpSecure: t.Optional(t.Boolean()),
      SmtpFrom: t.Optional(t.String()),
      Admin: t.Object({
        Username: t.String({ minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_-]+$' }),
        Email: t.Optional(t.String()),
        Password: t.String({ minLength: 8 }),
        FirstName: t.Optional(t.String()),
        LastName: t.Optional(t.String()),
      }),
    }),
  }),
});
