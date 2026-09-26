import { hexOrRgbToRgbString } from './hex-or-rgb-to-rgb-string.util';

/**
 * Fill badge bg/border tokens when the theming engine provides a base color
 * but not the translucent surfaces (e.g. success-border).
 */
export function deriveThemeBadgeSurfaces(result: Record<string, string>): void {
  const successColor = result['success'];
  if (successColor) {
    if (!result['success-bg']) {
      result['success-bg'] = `rgba(${hexOrRgbToRgbString(successColor)}, 0.12)`;
    }
    if (!result['success-border']) {
      result['success-border'] = `rgba(${hexOrRgbToRgbString(successColor)}, 0.3)`;
    }
  }

  const warningColor = result['warning'];
  if (warningColor) {
    if (!result['warning-bg']) {
      result['warning-bg'] = `rgba(${hexOrRgbToRgbString(warningColor)}, 0.12)`;
    }
    if (!result['warning-border']) {
      result['warning-border'] = `rgba(${hexOrRgbToRgbString(warningColor)}, 0.3)`;
    }
  }
}
