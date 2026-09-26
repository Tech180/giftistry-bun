import type { ThemeResolver } from '../../application/ports/theme-resolver.port';
import type { ThemeColors } from '../../application/interfaces/theme-colors.interface';
import { sql } from '@/common/database';
import { parseJsonField } from '@/common/utils/parse-json-field.util';
import { getThemingEnginePath } from '@/common/utils/theming-engine-root.util';
import { applyThemeCssVariables } from '../utils/apply-theme-css-variables.util';
import { deriveThemeBadgeSurfaces } from '../utils/derive-theme-badge-surfaces.util';
import { parseCssColor } from '../utils/parse-css-color.util';

export class PostgresThemeResolver implements ThemeResolver {
  async resolveThemeColors(themeName: string): Promise<ThemeColors> {
    const result: Record<string, string> = {};

    // 1. Base tokens from theming-engine default-light (includes success/warning)
    try {
      const defaultCssPath = getThemingEnginePath('dist/css/themes/default-light.css');
      const file = Bun.file(defaultCssPath);
      if (await file.exists()) {
        applyThemeCssVariables(await file.text(), result);
      }
    } catch (e) {
      console.error(`Failed to load default-light theme CSS variables:`, e);
    }

    // 2. Load user-selected custom theme from DB or other preset themes
    if (themeName && themeName.startsWith('custom-')) {
      try {
        const [customTheme] = await sql<any[]>`
          SELECT name, colors, advanced FROM user_custom_themes WHERE id = ${themeName}
        `;
        if (customTheme) {
          const colors = parseJsonField<Record<string, string>>(customTheme.colors, {});
          if (colors.primary) result['primary'] = colors.primary;
          if (colors.bg) result['bg'] = colors.bg;
          if (colors.surface) result['surface'] = colors.surface;
          if (colors.border) result['border'] = colors.border;
          if (colors.text) result['text'] = colors.text;
          const textMuted = colors['text-muted'] || colors.textMuted || colors.text;
          if (textMuted) result['text-muted'] = textMuted;
        }
      } catch (e) {
        console.error(`Failed to load custom theme ${themeName} from DB:`, e);
      }
    } else if (themeName && themeName !== 'default') {
      try {
        const cssPath = getThemingEnginePath('dist/css/themes', `${themeName}-light.css`);
        const file = Bun.file(cssPath);
        if (await file.exists()) {
          applyThemeCssVariables(await file.text(), result);
        }
      } catch (e) {
        console.error(`Failed to load preset theme ${themeName} CSS variables:`, e);
      }
    }

    deriveThemeBadgeSurfaces(result);

    return {
      bg: parseCssColor(result['bg']),
      border: parseCssColor(result['border']),
      text: parseCssColor(result['text']),
      textMuted: parseCssColor(result['text-muted']),
      primary: parseCssColor(result['primary']),

      success: parseCssColor(result['success']),
      successBg: parseCssColor(result['success-bg']),
      successBorder: parseCssColor(result['success-border']),

      warning: parseCssColor(result['warning']),
      warningBg: parseCssColor(result['warning-bg']),
      warningBorder: parseCssColor(result['warning-border']),

      customFieldText: parseCssColor(result['primary']),
      customFieldBg: parseCssColor(result['primary'], 0.08),
      customFieldBorder: parseCssColor(result['primary'], 0.2),
    };
  }
}
