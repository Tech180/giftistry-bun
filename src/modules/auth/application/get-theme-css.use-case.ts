import path from 'path';
import { AppError } from '@/common/middlewares/error.middleware';
import {
  THEME_IDS,
} from '../../../../../theming-engine/src/domains/brands/theme-catalog';
import type { UserRepository, CustomTheme } from '../domain/ports/user.repository';

export type ThemeAppearance = 'light' | 'dark';

export interface ThemeCssTokens {
  primary: string;
  primaryHover: string;
  accent: string;
  bg: string;
  surface: string;
  surfaceHover: string;
  surfaceGlass: string;
  border: string;
  text: string;
  textMuted: string;
  radius: string;
  shadow: string;
  bgGradient: string;
}

const DEFAULT_TOKENS: ThemeCssTokens = {
  primary: '#ff00ff',
  primaryHover: '#cc00cc',
  accent: '#00ffff',
  bg: '#121212',
  surface: '#1e1e1e',
  surfaceHover: '#2d2d2d',
  surfaceGlass: 'rgba(30, 30, 30, 0.5)',
  border: '#333333',
  text: '#ffffff',
  textMuted: '#aaaaaa',
  radius: '12px',
  shadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  bgGradient: 'linear-gradient(135deg, #121212 0%, #1e1e1e 100%)',
};

function themingEngineRoot(): string {
  return path.join(import.meta.dir, '../../../../../theming-engine');
}

function tokensFromCustomTheme(theme: CustomTheme): ThemeCssTokens {
  const colors = theme.Colors;
  const advanced = theme.Advanced;
  const radius = advanced.radius;
  const shadows = advanced.shadows;
  const radiusDefault =
    radius && typeof radius === 'object' && 'default' in radius
      ? String((radius as { default?: unknown }).default ?? DEFAULT_TOKENS.radius)
      : DEFAULT_TOKENS.radius;
  const shadowMd =
    shadows && typeof shadows === 'object' && 'md' in shadows
      ? String((shadows as { md?: unknown }).md ?? DEFAULT_TOKENS.shadow)
      : DEFAULT_TOKENS.shadow;

  return {
    primary: colors.primary || DEFAULT_TOKENS.primary,
    primaryHover: colors.primaryHover || `${colors.primary || DEFAULT_TOKENS.primary}dd`,
    accent: colors.primary || DEFAULT_TOKENS.accent,
    bg: colors.bg || DEFAULT_TOKENS.bg,
    surface: colors.surface || DEFAULT_TOKENS.surface,
    surfaceHover: colors.surfaceHover || `${colors.surface || DEFAULT_TOKENS.surface}f0`,
    surfaceGlass: DEFAULT_TOKENS.surfaceGlass,
    border: colors.border || DEFAULT_TOKENS.border,
    text: colors.text || DEFAULT_TOKENS.text,
    textMuted: colors['text-muted'] || colors.textMuted || colors.text || DEFAULT_TOKENS.textMuted,
    radius: radiusDefault,
    shadow: shadowMd,
    bgGradient: `linear-gradient(135deg, ${colors.bg || DEFAULT_TOKENS.bg} 0%, ${colors.surface || DEFAULT_TOKENS.surface} 100%)`,
  };
}

export class GetThemeCssUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(themeId: string, appearance: string): Promise<string> {
    if (appearance !== 'light' && appearance !== 'dark') {
      throw new AppError('Invalid appearance. Must be light or dark.', 400, 'INVALID_APPEARANCE');
    }

    if (THEME_IDS.includes(themeId)) {
      const filePath = path.join(
        themingEngineRoot(),
        'dist/css/themes',
        `${themeId}-${appearance}.css`
      );
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return file.text();
      }

      console.warn(
        `[WARNING] Built-in theme file not found: ${filePath}. Please make sure to run the build command inside the theming-engine directory.`
      );
    }

    try {
      const customTheme = await this.userRepo.findCustomThemeById(themeId);
      const dbTokens = customTheme ? tokensFromCustomTheme(customTheme) : DEFAULT_TOKENS;
      const { compileDynamicThemeCss } = await import(
        '../../../../../theming-engine/src/dynamic-compiler'
      );
      return compileDynamicThemeCss(themeId, appearance, dbTokens);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new AppError(`Failed to compile theme: ${message}`, 500, 'THEME_COMPILE_FAILED');
    }
  }
}
