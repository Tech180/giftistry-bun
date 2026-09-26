import { AppError } from '@/common/domain/errors/app-error';
import type { CustomTheme } from '../../../domain/interfaces/custom-theme.interface';
import type { ThemeCssTokens } from '../interfaces/theme-css-tokens.interface';

function requireColor(colors: Record<string, string>, key: string): string {
  const value = colors[key]?.trim();
  if (!value) {
    throw new AppError(`Custom theme is missing color: ${key}`, 400, 'BAD_REQUEST');
  }
  return value;
}

function requireAdvancedString(
  advanced: Record<string, unknown>,
  group: string,
  key: string
): string {
  const container = advanced[group];
  if (!container || typeof container !== 'object' || !(key in container)) {
    throw new AppError(`Custom theme is missing advanced.${group}.${key}`, 400, 'BAD_REQUEST');
  }
  const value = String((container as Record<string, unknown>)[key] ?? '').trim();
  if (!value) {
    throw new AppError(`Custom theme is missing advanced.${group}.${key}`, 400, 'BAD_REQUEST');
  }
  return value;
}

export function tokensFromCustomTheme(theme: CustomTheme): ThemeCssTokens {
  const colors = theme.Colors;
  const primary = requireColor(colors, 'primary');
  const bg = requireColor(colors, 'bg');
  const surface = requireColor(colors, 'surface');
  const border = requireColor(colors, 'border');
  const text = requireColor(colors, 'text');
  const textMuted = colors['text-muted']?.trim() || colors.textMuted?.trim() || text;

  const advanced = theme.Advanced ?? {};
  const radius = requireAdvancedString(advanced, 'radius', 'default');
  const shadow = requireAdvancedString(advanced, 'shadows', 'md');

  return {
    primary,
    primaryHover: colors.primaryHover?.trim() || `${primary}dd`,
    accent: colors.primary?.trim() || primary,
    bg,
    surface,
    surfaceHover: colors.surfaceHover?.trim() || `${surface}f0`,
    surfaceGlass: colors.surfaceGlass?.trim() || `${surface}80`,
    border,
    text,
    textMuted,
    radius,
    shadow,
    bgGradient: `linear-gradient(135deg, ${bg} 0%, ${surface} 100%)`,
  };
}
