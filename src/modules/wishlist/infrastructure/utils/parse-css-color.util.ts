import type { ThemeColorRgb } from '../../application/interfaces/theme-color-rgb.interface';

export function parseCssColor(colorStr: string | undefined, alphaMultiplier = 1.0): ThemeColorRgb {
  if (!colorStr) {
    return { red: 0, green: 0, blue: 0 };
  }

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

  if (str === 'white') {
    return { red: 1, green: 1, blue: 1 };
  }

  if (str === 'black') {
    return { red: 0, green: 0, blue: 0 };
  }

  return { red: 0, green: 0, blue: 0 };
}
