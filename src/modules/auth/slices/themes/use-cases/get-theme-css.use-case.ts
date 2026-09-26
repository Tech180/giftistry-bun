import { AppError } from '@/common/domain/errors/app-error';
import { getThemingEnginePath } from '@/common/utils/theming-engine-root.util';
import { THEME_IDS } from '../../../../../../../theming-engine/src/domains/brands/theme-catalog';
import type { UserRepository } from '../../../domain/ports/user.repository';
import type { ThemeAppearance } from '../interfaces/theme-appearance.type';
import { tokensFromCustomTheme } from '../utils/tokens-from-custom-theme.util';

export class GetThemeCssUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(themeId: string, appearance: string): Promise<string> {
    if (appearance !== 'light' && appearance !== 'dark') {
      throw new AppError('Invalid appearance. Must be light or dark.', 400, 'INVALID_APPEARANCE');
    }

    if (THEME_IDS.includes(themeId)) {
      const filePath = getThemingEnginePath(
        'dist/css/themes',
        `${themeId}-${appearance}.css`
      );
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return file.text();
      }

      throw new AppError(
        `Built-in theme file not found: ${filePath}. Run the build command inside theming-engine.`,
        404,
        'THEME_FILE_NOT_FOUND'
      );
    }

    const customTheme = await this.userRepo.findCustomThemeById(themeId);
    if (!customTheme) {
      throw new AppError('Theme not found', 404, 'NOT_FOUND');
    }

    try {
      const dbTokens = tokensFromCustomTheme(customTheme);
      const { compileDynamicThemeCss } = await import(
        getThemingEnginePath('src/dynamic-compiler')
      );
      return compileDynamicThemeCss(themeId, appearance as ThemeAppearance, dbTokens);
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new AppError(`Failed to compile theme: ${message}`, 500, 'THEME_COMPILE_FAILED');
    }
  }
}
