import type { ThemeResolver, ThemeColors, ThemeColorRgb } from '../application/ports/theme-resolver.port';
import { sql } from '@/common/database/connection';
import * as path from 'path';

function parseCssColor(colorStr: string | undefined, alphaMultiplier = 1.0): ThemeColorRgb {
  if (!colorStr) return { red: 0, green: 0, blue: 0 };
  const str = colorStr.trim().toLowerCase();

  if (str.startsWith('rgba')) {
    const match = str.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
    if (match) {
      const r = parseInt(match[1]!, 10) / 255;
      const g = parseInt(match[2]!, 10) / 255;
      const b = parseInt(match[3]!, 10) / 255;
      const a = parseFloat(match[4]!) * alphaMultiplier;
      // Blend with white background
      return {
        red: r * a + 1.0 * (1 - a),
        green: g * a + 1.0 * (1 - a),
        blue: b * a + 1.0 * (1 - a),
      };
    }
  }

  if (str.startsWith('rgb')) {
    const match = str.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (match) {
      const r = parseInt(match[1]!, 10) / 255;
      const g = parseInt(match[2]!, 10) / 255;
      const b = parseInt(match[3]!, 10) / 255;
      // Apply alphaMultiplier blending with white background
      const a = alphaMultiplier;
      return {
        red: r * a + 1.0 * (1 - a),
        green: g * a + 1.0 * (1 - a),
        blue: b * a + 1.0 * (1 - a),
      };
    }
  }

  if (str.startsWith('#')) {
    const hex = str.substring(1);
    let r = 0, g = 0, b = 0, a = 1.0;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0]! + hex[0]!, 16) / 255;
      g = parseInt(hex[1]! + hex[1]!, 16) / 255;
      b = parseInt(hex[2]! + hex[2]!, 16) / 255;
      if (hex.length === 4) {
        a = (parseInt(hex[3]! + hex[3]!, 16) / 255) * alphaMultiplier;
      } else {
        a = alphaMultiplier;
      }
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
      if (hex.length === 8) {
        a = (parseInt(hex.substring(6, 8), 16) / 255) * alphaMultiplier;
      } else {
        a = alphaMultiplier;
      }
    }
    // Blend with white background
    return {
      red: r * a + 1.0 * (1 - a),
      green: g * a + 1.0 * (1 - a),
      blue: b * a + 1.0 * (1 - a),
    };
  }

  if (str === 'white') return { red: 1, green: 1, blue: 1 };
  if (str === 'black') return { red: 0, green: 0, blue: 0 };

  return { red: 0, green: 0, blue: 0 };
}

function hexOrRgbToRgbString(colorStr: string): string {
  const str = colorStr.trim().toLowerCase();
  if (str.startsWith('rgb')) {
    const match = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (match) {
      return `${match[1]!}, ${match[2]!}, ${match[3]!}`;
    }
  }
  if (str.startsWith('#')) {
    const hex = str.substring(1);
    let r = 0, g = 0, b = 0;
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0]! + hex[0]!, 16);
      g = parseInt(hex[1]! + hex[1]!, 16);
      b = parseInt(hex[2]! + hex[2]!, 16);
    } else if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    return `${r}, ${g}, ${b}`;
  }
  return '0, 0, 0';
}

export class PostgresThemeResolver implements ThemeResolver {
  async resolveThemeColors(themeName: string): Promise<ThemeColors> {
    const result: Record<string, string> = {};

    // 1. Try loading default theme light variables from default-light.css
    try {
      const defaultCssPath = path.join(import.meta.dir, '../../../../../theming-engine/dist/css/themes/default-light.css');
      const file = Bun.file(defaultCssPath);
      if (await file.exists()) {
        const content = await file.text();
        const regex = /--theme-([\w-]+)\s*:\s*([^;]+);/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const key = match[1]!.trim();
          const value = match[2]!.trim();
          result[key] = value;
        }
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
          let colors = customTheme.colors;
          if (typeof colors === 'string') {
            colors = JSON.parse(colors);
          }
          if (colors && typeof colors === 'object') {
            result['primary'] = colors.primary || result['primary'];
            result['bg'] = colors.bg || result['bg'];
            result['surface'] = colors.surface || result['surface'];
            result['border'] = colors.border || result['border'];
            result['text'] = colors.text || result['text'];
            result['text-muted'] = colors['text-muted'] || colors.textMuted || colors.text || result['text-muted'];
          }
        }
      } catch (e) {
        console.error(`Failed to load custom theme ${themeName} from DB:`, e);
      }
    } else if (themeName && themeName !== 'default') {
      // Preset theme
      try {
        const cssPath = path.join(import.meta.dir, '../../../../../theming-engine/dist/css/themes', `${themeName}-light.css`);
        const file = Bun.file(cssPath);
        if (await file.exists()) {
          const content = await file.text();
          const regex = /--theme-([\w-]+)\s*:\s*([^;]+);/g;
          let match;
          while ((match = regex.exec(content)) !== null) {
            const key = match[1]!.trim();
            const value = match[2]!.trim();
            result[key] = value;
          }
        }
      } catch (e) {
        console.error(`Failed to load preset theme ${themeName} CSS variables:`, e);
      }
    }

    // Derive dynamic transparent background/borders for badges if they don't exist
    const successColor = result['success'] || '#10b981';
    const warningColor = result['warning'] || '#f59e0b';

    if (!result['success-bg']) {
      result['success-bg'] = `rgba(${hexOrRgbToRgbString(successColor)}, 0.12)`;
    }
    if (!result['success-border']) {
      result['success-border'] = `rgba(${hexOrRgbToRgbString(successColor)}, 0.3)`;
    }
    if (!result['warning-bg']) {
      result['warning-bg'] = `rgba(${hexOrRgbToRgbString(warningColor)}, 0.12)`;
    }
    if (!result['warning-border']) {
      result['warning-border'] = `rgba(${hexOrRgbToRgbString(warningColor)}, 0.3)`;
    }

    return {
      bg: parseCssColor(result['bg']),
      border: parseCssColor(result['border']),
      text: parseCssColor(result['text']),
      textMuted: parseCssColor(result['text-muted']),
      primary: parseCssColor(result['primary']),
      
      // Price Badge
      success: parseCssColor(result['success']),
      successBg: parseCssColor(result['success-bg']),
      successBorder: parseCssColor(result['success-border']),

      // Priority Badge
      warning: parseCssColor(result['warning']),
      warningBg: parseCssColor(result['warning-bg']),
      warningBorder: parseCssColor(result['warning-border']),

      // Custom Fields Badge
      customFieldText: parseCssColor(result['primary']),
      customFieldBg: parseCssColor(result['primary'], 0.08),
      customFieldBorder: parseCssColor(result['primary'], 0.2),
    };
  }
}
