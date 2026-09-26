import type { PDFFont, PDFPage } from 'pdf-lib';
import type { RGB } from 'pdf-lib';
import { PDF_CLAIMED_BADGE_HEIGHT } from '../constants/pdf-layout.constant';

export function getRelatedBadgeMetrics(
  label: string,
  fontBold: PDFFont
): { width: number; height: number } {
  const paddingX = 6;
  const fontSize = 8;
  const textWidth = fontBold.widthOfTextAtSize(label, fontSize);

  return {
    width: textWidth + paddingX * 2,
    height: PDF_CLAIMED_BADGE_HEIGHT,
  };
}

export function drawRelatedBadge(
  page: PDFPage,
  rightX: number,
  centerY: number,
  label: string,
  colors: {
    border: RGB;
    textMuted: RGB;
    customFieldBg: RGB;
  },
  fontBold: PDFFont
): { width: number; height: number } {
  const paddingX = 6;
  const paddingY = 2.5;
  const fontSize = 8;
  const { width: badgeWidth, height: badgeHeight } = getRelatedBadgeMetrics(label, fontBold);
  const textWidth = fontBold.widthOfTextAtSize(label, fontSize);
  const badgeX = rightX - badgeWidth;
  const badgeY = centerY - badgeHeight / 2;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeWidth,
    height: badgeHeight,
    color: colors.customFieldBg,
    borderColor: colors.border,
    borderWidth: 0.5,
  });

  page.drawText(label, {
    x: badgeX + (badgeWidth - textWidth) / 2,
    y: badgeY + paddingY + 0.5,
    size: fontSize,
    font: fontBold,
    color: colors.textMuted,
  });

  return { width: badgeWidth, height: badgeHeight };
}
