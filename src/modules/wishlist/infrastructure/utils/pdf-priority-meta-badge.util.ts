import type { PDFFont, PDFPage } from 'pdf-lib';
import type { RGB } from 'pdf-lib';
import { PDF_PRIORITY_META_LABEL } from '../constants/pdf-layout.constant';

export function getPriorityMetaBadgeMetrics(
  priorityValue: string,
  fontBold: PDFFont
): { width: number; height: number } {
  const paddingX = 6;
  const paddingY = 3;
  const labelSize = 6;
  const valueSize = 8;
  const label = PDF_PRIORITY_META_LABEL;
  const labelWidth = fontBold.widthOfTextAtSize(label, labelSize);
  const valueWidth = fontBold.widthOfTextAtSize(priorityValue, valueSize);
  const contentWidth = Math.max(labelWidth, valueWidth);

  return {
    width: contentWidth + paddingX * 2,
    height: labelSize + valueSize + paddingY * 2 + 2,
  };
}

export function drawPriorityMetaBadge(
  page: PDFPage,
  rightX: number,
  centerY: number,
  priorityValue: string,
  colors: {
    border: RGB;
    textMuted: RGB;
    customFieldBg: RGB;
  },
  fontBold: PDFFont
): { width: number; height: number } {
  const paddingX = 6;
  const paddingY = 3;
  const labelSize = 6;
  const valueSize = 8;
  const label = PDF_PRIORITY_META_LABEL;
  const { width: badgeWidth, height: badgeHeight } = getPriorityMetaBadgeMetrics(
    priorityValue,
    fontBold
  );
  const labelWidth = fontBold.widthOfTextAtSize(label, labelSize);
  const valueWidth = fontBold.widthOfTextAtSize(priorityValue, valueSize);
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
    x: badgeX + (badgeWidth - labelWidth) / 2,
    y: badgeY + badgeHeight - paddingY - labelSize,
    size: labelSize,
    font: fontBold,
    color: colors.textMuted,
  });

  page.drawText(priorityValue, {
    x: badgeX + (badgeWidth - valueWidth) / 2,
    y: badgeY + paddingY,
    size: valueSize,
    font: fontBold,
    color: colors.textMuted,
  });

  return { width: badgeWidth, height: badgeHeight };
}
