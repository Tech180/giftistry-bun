import { t } from 'elysia';

export const saveCustomThemeBodySchema = t.Object({
  Giftistry: t.Object({
    Theme: t.Object({
      Id: t.String(),
      Name: t.String(),
      Colors: t.Object({
        Primary: t.String(),
        Bg: t.String(),
        Surface: t.String(),
        Border: t.String(),
        Text: t.String(),
        TextMuted: t.Optional(t.String()),
      }),
      Advanced: t.Optional(
        t.Object({
          Shadows: t.Optional(
            t.Object({
              Sm: t.Optional(t.String()),
              Md: t.Optional(t.String()),
              Lg: t.Optional(t.String()),
            })
          ),
          Fonts: t.Optional(
            t.Object({
              Sans: t.Optional(t.String()),
            })
          ),
          Radius: t.Optional(
            t.Object({
              Default: t.Optional(t.String()),
            })
          ),
        })
      ),
    }),
  }),
});
