import type { PDFFont, PDFPage } from 'pdf-lib';
import type { RGB } from 'pdf-lib';
import {
  PDF_CLAIMED_BADGE_HEIGHT,
  PDF_CLAIMED_LABEL,
} from '../constants/pdf-layout.constant';

export function getClaimedBadgeMetrics(fontBold: PDFFont): { width: number; height: number } {
  const paddingX = 6;
  const fontSize = 8;
  const textWidth = fontBold.widthOfTextAtSize(PDF_CLAIMED_LABEL, fontSize);

  return {
    width: textWidth + paddingX * 2,
    height: PDF_CLAIMED_BADGE_HEIGHT,
  };
}

export function drawClaimedBadge(
  page: PDFPage,
  rightX: number,
  centerY: number,
  colors: {
    success: RGB;
    successBg: RGB;
    successBorder: RGB;
  },
  fontBold: PDFFont
): { width: number; height: number } {
  const paddingX = 6;
  const paddingY = 2.5;
  const fontSize = 8;
  const { width: badgeWidth, height: badgeHeight } = getClaimedBadgeMetrics(fontBold);
  const textWidth = fontBold.widthOfTextAtSize(PDF_CLAIMED_LABEL, fontSize);
  const badgeX = rightX - badgeWidth;
  const badgeY = centerY - badgeHeight / 2;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeWidth,
    height: badgeHeight,
    color: colors.successBg,
    borderColor: colors.successBorder,
    borderWidth: 0.5,
  });

  page.drawText(PDF_CLAIMED_LABEL, {
    x: badgeX + (badgeWidth - textWidth) / 2,
    y: badgeY + paddingY + 0.5,
    size: fontSize,
    font: fontBold,
    color: colors.success,
  });

  return { width: badgeWidth, height: badgeHeight };
}
