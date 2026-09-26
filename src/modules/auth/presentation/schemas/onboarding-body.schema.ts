import { t } from 'elysia';

export const onboardingBodySchema = t.Object({
  Giftistry: t.Object({
    Onboarding: t.Object({
      SkipStep: t.Optional(t.String()),
      CompleteUser: t.Optional(t.Boolean()),
      CompleteOwner: t.Optional(t.Boolean()),
      SkipOwner: t.Optional(t.Boolean()),
      Username: t.Optional(t.String()),
      FirstName: t.Optional(t.String()),
      LastName: t.Optional(t.String()),
      Bio: t.Optional(t.String()),
      Theme: t.Optional(t.String()),
      PublicAppUrl: t.Optional(t.String()),
      RegistrationMode: t.Optional(
        t.Union([t.Literal('open'), t.Literal('invite_only'), t.Literal('disabled')])
      ),
      SmtpType: t.Optional(t.Union([t.Literal('local'), t.Literal('remote')])),
      SmtpHost: t.Optional(t.String()),
      SmtpPort: t.Optional(t.Numeric()),
      SmtpUser: t.Optional(t.String()),
      SmtpPass: t.Optional(t.String()),
      SmtpSecure: t.Optional(t.Boolean()),
      SmtpFrom: t.Optional(t.String()),
      AiEnabled: t.Optional(t.Boolean()),
      AiWebSearchEnabled: t.Optional(t.Boolean()),
    }),
  }),
});
