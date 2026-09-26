import type { CustomThemeInput } from '../../domain/interfaces/custom-theme-input.interface';
import type { SaveCustomThemeRequest } from '../interfaces/save-custom-theme-request.interface';

export function mapSaveCustomThemePayload(theme: SaveCustomThemeRequest): CustomThemeInput {
  return {
    id: theme.Id,
    name: theme.Name,
    colors: {
      primary: theme.Colors.Primary,
      bg: theme.Colors.Bg,
      surface: theme.Colors.Surface,
      border: theme.Colors.Border,
      text: theme.Colors.Text,
      ...(theme.Colors.TextMuted !== undefined ? { 'text-muted': theme.Colors.TextMuted } : {}),
    },
    advanced: theme.Advanced
      ? {
          shadows: theme.Advanced.Shadows
            ? {
                sm: theme.Advanced.Shadows.Sm,
                md: theme.Advanced.Shadows.Md,
                lg: theme.Advanced.Shadows.Lg,
              }
            : undefined,
          fonts: theme.Advanced.Fonts
            ? {
                sans: theme.Advanced.Fonts.Sans,
              }
            : undefined,
          radius: theme.Advanced.Radius
            ? {
                default: theme.Advanced.Radius.Default,
              }
            : undefined,
        }
      : undefined,
  };
}
