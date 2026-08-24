import { PDFDocument, StandardFonts, PDFString, PDFName, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { PdfGenerator } from '../application/ports/pdf-generator.port';
import type { ThemeColors } from '../application/ports/theme-resolver.port';
import type { Wishlist } from '../domain/wishlist.entity';
import {
  PDF_LINKED_BADGE_PREFIX,
  PDF_RELATED_BADGE_LABEL,
} from '@/modules/item/domain/constants/pdf-relation-badge.constant';
import {
  buildRelatedGroupSymbolByItemId,
  getLinkedItemIdsFromExportItem,
  resolveRelationPeerNames,
} from '@/modules/item/domain/resolve-item-relations.util';
import { resolveCategoryPresentation } from '@/modules/item/domain/format-category-label.util';
import {
  countWrappedTextLines,
  normalizePdfNotesText,
} from './utils/normalize-pdf-notes-text.util';

function toPdfLibColor(c: { red: number; green: number; blue: number }) {
  return rgb(c.red, c.green, c.blue);
}

const PDF_ITEM_INDENT = 12;
const PDF_ITEM_TOP_GAP = 8;
const PDF_ITEM_BOTTOM_GAP = 6;
const PDF_TITLE_SIZE = 11;
const PDF_TITLE_LINE_HEIGHT = PDF_TITLE_SIZE * 1.25;
const PDF_PRICE_BADGE_HEIGHT = 14;
const PDF_LINK_HEIGHT = 11;
const PDF_DESCRIPTION_SIZE = 9.5;
const PDF_DESCRIPTION_LINE_HEIGHT = PDF_DESCRIPTION_SIZE * 1.15;
const PDF_DESCRIPTION_TOP_GAP = 3;
const PDF_BADGES_TOP_GAP = 6;
const PDF_META_BADGE_GAP = 6;
const PDF_LINK_GAP = 10;
const PDF_CLAIMED_BADGE_HEIGHT = 14;
const PDF_CLAIMED_LABEL = 'Claimed';
const PDF_ITEM_KEEP_WITH_DESC_LINES = 2;

export class PdfLibGenerator implements PdfGenerator {
  async generateWishlistPdf(
    wishlist: Wishlist,
    items: any[],
    themeColors: ThemeColors,
    ownerInfo: { name: string; username: string; avatarUrl?: string },
    viewerUserId?: string | null
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const PAGE_WIDTH = 612; // Letter size width
    const PAGE_HEIGHT = 792; // Letter size height
    const MARGIN_LEFT = 50;
    const MARGIN_RIGHT = 50;
    const MARGIN_TOP = 50;
    const MARGIN_BOTTOM = 50;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const pageRef = { current: page };
    const currentY = { y: PAGE_HEIGHT - MARGIN_TOP };

    const colors = {
      bg: toPdfLibColor(themeColors.bg),
      border: toPdfLibColor(themeColors.border),
      text: toPdfLibColor(themeColors.text),
      textMuted: toPdfLibColor(themeColors.textMuted),
      primary: toPdfLibColor(themeColors.primary),
      success: toPdfLibColor(themeColors.success),
      successBg: toPdfLibColor(themeColors.successBg),
      successBorder: toPdfLibColor(themeColors.successBorder),
      warning: toPdfLibColor(themeColors.warning),
      warningBg: toPdfLibColor(themeColors.warningBg),
      warningBorder: toPdfLibColor(themeColors.warningBorder),
      customFieldText: toPdfLibColor(themeColors.customFieldText),
      customFieldBg: toPdfLibColor(themeColors.customFieldBg),
      customFieldBorder: toPdfLibColor(themeColors.customFieldBorder),
    };

    // Helper function for text drawing with wrapping and page breaks
    const drawText = async (
      text: string,
      options: {
        font: any;
        size: number;
        color?: any;
        lineHeight?: number;
        marginTop?: number;
        indent?: number;
        maxWidth?: number;
      }
    ) => {
      const {
        font: txtFont,
        size,
        color = colors.text,
        lineHeight = size * 1.25,
        marginTop = 0,
        indent = 0,
        maxWidth = CONTENT_WIDTH - indent,
      } = options;

      currentY.y -= marginTop;

      const paragraphs = text.split('\n').map((para) => para.trim()).filter(Boolean);

      for (const para of paragraphs) {
        const words = para.split(/\s+/).filter(Boolean);
        let currentLine = '';
        const lines: string[] = [];

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const width = txtFont.widthOfTextAtSize(testLine, size);
          if (width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }

        for (const line of lines) {
          if (currentY.y - lineHeight < MARGIN_BOTTOM) {
            pageRef.current = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            currentY.y = PAGE_HEIGHT - MARGIN_TOP;
          }

          pageRef.current.drawText(line, {
            x: MARGIN_LEFT + indent,
            y: currentY.y - size,
            size,
            font: txtFont,
            color,
          });

          currentY.y -= lineHeight;
        }
      }
    };

    // Draw header title
    await drawText(wishlist.Title, {
      font: fontBold,
      size: 18,
      color: colors.text,
      maxWidth: CONTENT_WIDTH - 120,
    });

    // Draw metadata details
    const expirationDateText = wishlist.ExpiresAt
      ? new Date(wishlist.ExpiresAt).toLocaleDateString()
      : 'No expiration date';
    await drawText(`Expiration:\n${expirationDateText}`, {
      font,
      size: 9.5,
      color: colors.textMuted,
      marginTop: 6,
      maxWidth: CONTENT_WIDTH - 120,
    });

    // Owner Profile Section (Top Right)
    const avatarRadius = 22;
    const cx = PAGE_WIDTH - MARGIN_RIGHT - avatarRadius;
    const cy = PAGE_HEIGHT - MARGIN_TOP - avatarRadius;

    let avatarImage: any = null;
    const avatarUrl = ownerInfo.avatarUrl;
    if (avatarUrl && avatarUrl.startsWith('data:image/')) {
      try {
        const parts = avatarUrl.split(',');
        const base64Data = parts[1];
        if (base64Data) {
          const imageBytes = Buffer.from(base64Data, 'base64');
          if (avatarUrl.includes('image/png')) {
            avatarImage = await pdfDoc.embedPng(imageBytes);
          } else if (avatarUrl.includes('image/jpeg') || avatarUrl.includes('image/jpg')) {
            avatarImage = await pdfDoc.embedJpg(imageBytes);
          }
        }
      } catch (e) {
        console.error("Failed to embed base64 avatar image:", e);
      }
    }

    if (avatarImage) {
      // Draw avatar image
      pageRef.current.drawImage(avatarImage, {
        x: cx - avatarRadius,
        y: cy - avatarRadius,
        width: avatarRadius * 2,
        height: avatarRadius * 2,
      });

      // Draw white mask ring to crop the corners of the square image into a circle
      const maskInnerRadius = avatarRadius;
      const maskOuterRadius = avatarRadius * 1.5;
      const maskCenterRadius = (maskInnerRadius + maskOuterRadius) / 2;
      const maskThickness = maskOuterRadius - maskInnerRadius;

      pageRef.current.drawCircle({
        x: cx,
        y: cy,
        size: maskCenterRadius,
        borderColor: rgb(1, 1, 1),
        borderWidth: maskThickness,
      });

      // Draw a subtle border outline around the circular image
      pageRef.current.drawCircle({
        x: cx,
        y: cy,
        size: avatarRadius,
        borderColor: colors.border,
        borderWidth: 1,
      });
    } else {
      // Draw fallback avatar circle with initials
      let avatarBg = colors.primary; // default brand color
      if (avatarUrl && avatarUrl.startsWith('hsl')) {
        avatarBg = this.parseHslToRgbColor(avatarUrl);
      }

      // Draw avatar circle
      pageRef.current.drawCircle({
        x: cx,
        y: cy,
        size: avatarRadius,
        color: avatarBg,
      });

      // Draw initials inside avatar circle
      const firstInit = wishlist.OwnerFirstName ? wishlist.OwnerFirstName.charAt(0) : '';
      const lastInit = wishlist.OwnerLastName ? wishlist.OwnerLastName.charAt(0) : '';
      const initials = (firstInit && lastInit)
        ? `${firstInit}${lastInit}`
        : (wishlist.OwnerFirstName ? wishlist.OwnerFirstName.charAt(0) : (wishlist.OwnerUsername ? wishlist.OwnerUsername.charAt(0) : 'U'));
      const initialsStr = initials.toUpperCase();
      const initialsFontSize = 13;
      const initialsWidth = fontBold.widthOfTextAtSize(initialsStr, initialsFontSize);
      pageRef.current.drawText(initialsStr, {
        x: cx - initialsWidth / 2,
        y: cy - initialsFontSize / 2 + 1,
        size: initialsFontSize,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    }

    // Draw owner text below the icon (center-aligned with the icon)
    const textBaseY = cy - avatarRadius;
    
    // Username (first row below icon)
    const usernameText = `@${ownerInfo.username || 'user'}`;
    const usernameSize = 9.5;
    const usernameWidth = fontBold.widthOfTextAtSize(usernameText, usernameSize);
    const usernameY = textBaseY - 12;
    pageRef.current.drawText(usernameText, {
      x: cx - usernameWidth / 2,
      y: usernameY,
      size: usernameSize,
      font: fontBold,
      color: colors.text,
    });

    // Full name (second row below icon)
    const fullNameText = ownerInfo.name || 'Registry Owner';
    const fullNameSize = 8.5;
    const fullNameWidth = font.widthOfTextAtSize(fullNameText, fullNameSize);
    const fullNameY = usernameY - 11;
    pageRef.current.drawText(fullNameText, {
      x: cx - fullNameWidth / 2,
      y: fullNameY,
      size: fullNameSize,
      font,
      color: colors.textMuted,
    });

    // Set Y position below both columns before drawing separator line
    const profileBottomY = fullNameY - 5;
    currentY.y = Math.min(currentY.y, profileBottomY - 10);

    // Draw thin horizontal separator line
    currentY.y -= 5;
    pageRef.current.drawLine({
      start: { x: MARGIN_LEFT, y: currentY.y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: currentY.y },
      thickness: 1.5,
      color: colors.border,
    });
    currentY.y -= 10;

    const nameById = new Map<string, string>(
      items
        .filter((entry) => typeof entry?.Id === 'string')
        .map((entry) => [entry.Id as string, String(entry.Name ?? '')])
    );
    const relatedSymbolByItemId = buildRelatedGroupSymbolByItemId(items);

    // Group items by category
    const categoryGroups: { [key: string]: typeof items } = {};
    for (const item of items) {
      const cat = item.Category && item.Category.trim() ? item.Category.trim() : 'uncategorized';
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = [];
      }
      categoryGroups[cat].push(item);
    }

    const categories = Object.keys(categoryGroups).sort((a, b) => {
      if (a === 'uncategorized') return 1;
      if (b === 'uncategorized') return -1;
      return a.localeCompare(b);
    });

    let isFirstCategory = true;
    for (const cat of categories) {
      const { CategoryLabel } = resolveCategoryPresentation(cat);
      const displayCategory = CategoryLabel;

      // Draw category section heading
      await drawText(displayCategory.toUpperCase(), {
        font: fontBold,
        size: 13,
        color: colors.primary, // Primary brand color
        marginTop: isFirstCategory ? 4 : 15,
      });
      isFirstCategory = false;

      // Category underline
      currentY.y -= 4;
      pageRef.current.drawLine({
        start: { x: MARGIN_LEFT, y: currentY.y },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: currentY.y },
        thickness: 0.5,
        color: colors.border,
      });
      currentY.y -= 12;

      const catItems = categoryGroups[cat] || [];
      // Sort: priority (ascending), then name (alphabetical)
      const sortedItems = [...catItems].sort((a, b) => {
        const aPri = a.Priority !== null && a.Priority !== undefined ? a.Priority : 9999;
        const bPri = b.Priority !== null && b.Priority !== undefined ? b.Priority : 9999;
        if (aPri !== bPri) return aPri - bPri;
        return a.Name.localeCompare(b.Name);
      });

      for (const item of sortedItems) {
        // Star indicator for favorites
        const isFav = item.Description ? item.Description.includes('★') || item.Description.includes('⭐') : false;
        const starPrefix = isFav ? '★ ' : '';

        // Price, Link, and Priority extraction
        let priceText = '';
        let hasPrice = false;
        if (item.Links && item.Links.length > 0) {
          const firstLink = item.Links[0];
          if (firstLink.ExtractedPrice !== null && firstLink.ExtractedPrice !== undefined) {
            priceText = `$${Number(firstLink.ExtractedPrice).toFixed(2)}`;
            hasPrice = true;
          }
        }

        const hasLink = item.Links && item.Links.length > 0 && !!item.Links[0].Url;
        const firstLink = hasLink ? item.Links[0] : null;

        const hasPriority = item.Priority !== null && item.Priority !== undefined;
        const priorityText = hasPriority ? String(item.Priority) : '';
        const isClaimed = !!item.IsClaimed;
        const relatedSymbol = relatedSymbolByItemId.get(item.Id);
        const hasRelated = !!relatedSymbol;
        const relatedBadgeText = hasRelated
          ? `${PDF_RELATED_BADGE_LABEL} ${relatedSymbol}`
          : '';
        const priorityOnTitleRow = hasPriority && !hasPrice;
        const priorityOnDescriptionRow = hasPriority && hasPrice;
        const claimedMetrics = isClaimed
          ? this.getClaimedBadgeMetrics(fontBold)
          : { width: 0, height: 0 };
        const relatedMetrics = hasRelated
          ? this.getRelatedBadgeMetrics(relatedBadgeText, fontBold)
          : { width: 0, height: 0 };
        const priorityMetrics = hasPriority
          ? this.getPriorityMetaBadgeMetrics(priorityText, fontBold)
          : { width: 0, height: 0 };

        let titleTrailingWidth = 0;
        if (hasPrice) {
          const priceTextWidth = fontBold.widthOfTextAtSize(priceText, 9);
          titleTrailingWidth += priceTextWidth + 12;
        }
        if (priorityOnTitleRow) {
          titleTrailingWidth +=
            priorityMetrics.width + (titleTrailingWidth > 0 ? PDF_META_BADGE_GAP : 0);
        }
        if (isClaimed) {
          titleTrailingWidth +=
            claimedMetrics.width + (titleTrailingWidth > 0 ? PDF_META_BADGE_GAP : 0);
        }
        if (hasRelated) {
          titleTrailingWidth +=
            relatedMetrics.width + (titleTrailingWidth > 0 ? PDF_META_BADGE_GAP : 0);
        }

        currentY.y -= PDF_ITEM_TOP_GAP;

        const contentRowHeight = Math.max(
          PDF_TITLE_LINE_HEIGHT,
          hasPrice ? PDF_PRICE_BADGE_HEIGHT : 0,
          hasLink ? PDF_LINK_HEIGHT : 0,
          isClaimed ? claimedMetrics.height : 0,
          hasRelated ? relatedMetrics.height : 0,
          priorityOnTitleRow ? priorityMetrics.height : 0
        );

        const descriptionText = this.getNotesText(item.Description);
        const showDescriptionRow = !!descriptionText || priorityOnDescriptionRow;
        const descriptionMaxWidth = (() => {
          const descriptionRightEdge = priorityOnDescriptionRow
            ? PAGE_WIDTH - MARGIN_RIGHT - priorityMetrics.width - 8
            : PAGE_WIDTH - MARGIN_RIGHT;
          return descriptionRightEdge - MARGIN_LEFT - PDF_ITEM_INDENT;
        })();
        const descriptionLineCount = descriptionText
          ? countWrappedTextLines(
              descriptionText,
              fontItalic,
              PDF_DESCRIPTION_SIZE,
              descriptionMaxWidth
            )
          : 0;
        const descriptionBlockHeight = showDescriptionRow
          ? PDF_DESCRIPTION_TOP_GAP +
            Math.max(
              descriptionLineCount * PDF_DESCRIPTION_LINE_HEIGHT,
              priorityOnDescriptionRow ? priorityMetrics.height : 0,
              descriptionText ? 0 : PDF_DESCRIPTION_LINE_HEIGHT
            )
          : 0;

        // Keep title with the start of the description to avoid orphaned headings.
        const keepTogetherHeight =
          contentRowHeight +
          Math.min(
            descriptionBlockHeight,
            PDF_DESCRIPTION_TOP_GAP + PDF_ITEM_KEEP_WITH_DESC_LINES * PDF_DESCRIPTION_LINE_HEIGHT
          );

        if (currentY.y - keepTogetherHeight < MARGIN_BOTTOM) {
          pageRef.current = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          currentY.y = PAGE_HEIGHT - MARGIN_TOP;
        }

        const blockTopY = currentY.y;
        const rowCenterY = blockTopY - contentRowHeight / 2;
        const headerBottomY = blockTopY - contentRowHeight;

        let badgeX = PAGE_WIDTH - MARGIN_RIGHT;
        let linkX = PAGE_WIDTH - MARGIN_RIGHT;

        if (hasPrice) {
          const paddingX = 6;
          const paddingY = 2.5;
          const fontSize = 9;
          const textWidth = fontBold.widthOfTextAtSize(priceText, fontSize);
          const badgeWidth = textWidth + paddingX * 2;
          const badgeHeight = PDF_PRICE_BADGE_HEIGHT;
          badgeX = PAGE_WIDTH - MARGIN_RIGHT - badgeWidth;
          const badgeY = rowCenterY - badgeHeight / 2;

          pageRef.current.drawRectangle({
            x: badgeX,
            y: badgeY,
            width: badgeWidth,
            height: badgeHeight,
            color: colors.successBg,
            borderColor: colors.successBorder,
            borderWidth: 0.5,
          });

          pageRef.current.drawText(priceText, {
            x: badgeX + paddingX,
            y: badgeY + paddingY + 0.5,
            size: fontSize,
            font: fontBold,
            color: colors.success,
          });
        }

        if (hasLink && firstLink) {
          const linkText = firstLink.RetailerName || 'Link';
          const linkTextWidth = fontBold.widthOfTextAtSize(linkText, 9);

          linkX =
            titleTrailingWidth > 0
              ? PAGE_WIDTH - MARGIN_RIGHT - titleTrailingWidth - PDF_LINK_GAP - linkTextWidth
              : PAGE_WIDTH - MARGIN_RIGHT - linkTextWidth;

          const linkY = rowCenterY - PDF_LINK_HEIGHT / 2;

          pageRef.current.drawText(linkText, {
            x: linkX,
            y: linkY + 0.5,
            size: 9,
            font: fontBold,
            color: colors.primary,
          });

          pageRef.current.drawLine({
            start: { x: linkX, y: linkY - 1 },
            end: { x: linkX + linkTextWidth, y: linkY - 1 },
            thickness: 0.8,
            color: colors.primary,
          });

          if (firstLink.Url) {
            const linkAnnotation = pdfDoc.context.register(
              pdfDoc.context.obj({
                Type: 'Annot',
                Subtype: 'Link',
                Rect: [
                  linkX,
                  linkY - 2,
                  linkX + linkTextWidth,
                  linkY + PDF_LINK_HEIGHT,
                ],
                Border: [0, 0, 0],
                A: {
                  Type: 'Action',
                  S: 'URI',
                  URI: PDFString.of(firstLink.Url),
                },
              })
            );

            const annotsRef = pageRef.current.node.get(PDFName.of('Annots'));
            let annotsArray: any;
            if (!annotsRef) {
              annotsArray = pdfDoc.context.obj([]);
              pageRef.current.node.set(PDFName.of('Annots'), annotsArray);
            } else {
              annotsArray = pdfDoc.context.lookup(annotsRef);
            }
            if (annotsArray && typeof annotsArray.push === 'function') {
              annotsArray.push(linkAnnotation);
            }
          }
        }

        let titleBadgeCursorX = PAGE_WIDTH - MARGIN_RIGHT;
        if (hasPrice) {
          titleBadgeCursorX = badgeX - PDF_META_BADGE_GAP;
        }

        if (priorityOnTitleRow) {
          const priorityBadge = this.drawPriorityMetaBadge(
            pageRef.current,
            titleBadgeCursorX,
            rowCenterY,
            priorityText,
            colors,
            fontBold
          );
          titleBadgeCursorX -= priorityBadge.width + PDF_META_BADGE_GAP;
        }

        if (isClaimed) {
          const claimedBadge = this.drawClaimedBadge(
            pageRef.current,
            titleBadgeCursorX,
            rowCenterY,
            colors,
            fontBold
          );
          titleBadgeCursorX -= claimedBadge.width + PDF_META_BADGE_GAP;
        }

        if (hasRelated) {
          this.drawRelatedBadge(
            pageRef.current,
            titleBadgeCursorX,
            rowCenterY,
            relatedBadgeText,
            colors,
            fontBold
          );
        }

        const rightContentEdge = hasLink
          ? linkX
          : titleTrailingWidth > 0
            ? PAGE_WIDTH - MARGIN_RIGHT - titleTrailingWidth
            : hasPrice
              ? badgeX
              : PAGE_WIDTH - MARGIN_RIGHT;

        currentY.y = blockTopY;
        await drawText(`•  ${starPrefix}${item.Name}`, {
          font: fontBold,
          size: PDF_TITLE_SIZE,
          color: colors.text,
          marginTop: (contentRowHeight - PDF_TITLE_LINE_HEIGHT) / 2,
          indent: PDF_ITEM_INDENT,
          maxWidth: rightContentEdge - MARGIN_LEFT - PDF_ITEM_INDENT - 8,
        });

        if (currentY.y > headerBottomY) {
          currentY.y = headerBottomY;
        }

        if (showDescriptionRow) {
          currentY.y -= PDF_DESCRIPTION_TOP_GAP;

          if (priorityOnDescriptionRow) {
            const priorityCenterY = currentY.y - priorityMetrics.height / 2;
            this.drawPriorityMetaBadge(
              pageRef.current,
              PAGE_WIDTH - MARGIN_RIGHT,
              priorityCenterY,
              priorityText,
              colors,
              fontBold
            );
          }

          if (descriptionText) {
            await drawText(descriptionText, {
              font: fontItalic,
              size: PDF_DESCRIPTION_SIZE,
              color: colors.textMuted,
              lineHeight: PDF_DESCRIPTION_LINE_HEIGHT,
              indent: PDF_ITEM_INDENT,
              maxWidth: descriptionMaxWidth,
            });
          } else if (priorityOnDescriptionRow) {
            currentY.y -= priorityMetrics.height;
          }
        }

        // Gather badges: linked peers first, then custom fields
        const badges: Array<{
          text: string;
          bg?: ReturnType<typeof rgb>;
          fg?: ReturnType<typeof rgb>;
          border?: ReturnType<typeof rgb>;
        }> = [];

        for (const peerName of resolveRelationPeerNames(
          item.Id,
          items,
          nameById,
          getLinkedItemIdsFromExportItem
        )) {
          badges.push({
            text: `${PDF_LINKED_BADGE_PREFIX}${peerName}`,
            bg: colors.customFieldBg,
            fg: colors.primary,
            border: colors.customFieldBorder,
          });
        }

        for (const customBadge of this.collectCustomFieldBadges(item)) {
          badges.push({ text: customBadge });
        }

        // Draw Badges Row
        if (badges.length > 0) {
          const paddingX = 6;
          const paddingY = 2.5;
          const fontSize = 8;
          const badgeHeight = fontSize + paddingY * 2;
          const spaceX = 5;
          const spaceY = 4;

          let startX = MARGIN_LEFT + PDF_ITEM_INDENT;
          const endX = PAGE_WIDTH - MARGIN_RIGHT;

          currentY.y -= PDF_BADGES_TOP_GAP;

          for (const badge of badges) {
            const textWidth = font.widthOfTextAtSize(badge.text, fontSize);
            const badgeWidth = textWidth + paddingX * 2;

            // Wrap line if badges exceed CONTENT_WIDTH
            if (startX + badgeWidth > endX) {
              startX = MARGIN_LEFT + PDF_ITEM_INDENT;
              currentY.y -= (badgeHeight + spaceY);
            }

            // Page break check
            if (currentY.y - badgeHeight < MARGIN_BOTTOM) {
              pageRef.current = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
              currentY.y = PAGE_HEIGHT - MARGIN_TOP;
              startX = MARGIN_LEFT + PDF_ITEM_INDENT;
            }

            const bg = badge.bg || colors.customFieldBg;
            const fg = badge.fg || colors.customFieldText;
            const borderColor = badge.border || colors.customFieldBorder;

            pageRef.current.drawRectangle({
              x: startX,
              y: currentY.y - badgeHeight,
              width: badgeWidth,
              height: badgeHeight,
              color: bg,
              borderColor,
              borderWidth: 0.5,
            });

            pageRef.current.drawText(badge.text, {
              x: startX + paddingX,
              y: currentY.y - badgeHeight + paddingY + 0.5,
              size: fontSize,
              font,
              color: fg,
            });

            startX += badgeWidth + spaceX;
          }

          currentY.y -= badgeHeight;
        }

        currentY.y -= PDF_ITEM_BOTTOM_GAP;
      }

      currentY.y -= 8; // Space between categories
    }

    return await pdfDoc.save();
  }

  private getClaimedBadgeMetrics(fontBold: PDFFont): { width: number; height: number } {
    const paddingX = 6;
    const fontSize = 8;
    const textWidth = fontBold.widthOfTextAtSize(PDF_CLAIMED_LABEL, fontSize);

    return {
      width: textWidth + paddingX * 2,
      height: PDF_CLAIMED_BADGE_HEIGHT,
    };
  }

  private drawClaimedBadge(
    page: PDFPage,
    rightX: number,
    centerY: number,
    colors: {
      success: ReturnType<typeof rgb>;
      successBg: ReturnType<typeof rgb>;
      successBorder: ReturnType<typeof rgb>;
    },
    fontBold: PDFFont
  ): { width: number; height: number } {
    const paddingX = 6;
    const paddingY = 2.5;
    const fontSize = 8;
    const { width: badgeWidth, height: badgeHeight } = this.getClaimedBadgeMetrics(fontBold);
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

  private getRelatedBadgeMetrics(
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

  private drawRelatedBadge(
    page: PDFPage,
    rightX: number,
    centerY: number,
    label: string,
    colors: {
      border: ReturnType<typeof rgb>;
      textMuted: ReturnType<typeof rgb>;
      customFieldBg: ReturnType<typeof rgb>;
    },
    fontBold: PDFFont
  ): { width: number; height: number } {
    const paddingX = 6;
    const paddingY = 2.5;
    const fontSize = 8;
    const { width: badgeWidth, height: badgeHeight } = this.getRelatedBadgeMetrics(
      label,
      fontBold
    );
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

  private getPriorityMetaBadgeMetrics(
    priorityValue: string,
    fontBold: PDFFont
  ): { width: number; height: number } {
    const paddingX = 6;
    const paddingY = 3;
    const labelSize = 6;
    const valueSize = 8;
    const label = 'PRIORITY:';
    const labelWidth = fontBold.widthOfTextAtSize(label, labelSize);
    const valueWidth = fontBold.widthOfTextAtSize(priorityValue, valueSize);
    const contentWidth = Math.max(labelWidth, valueWidth);

    return {
      width: contentWidth + paddingX * 2,
      height: labelSize + valueSize + paddingY * 2 + 2,
    };
  }

  private drawPriorityMetaBadge(
    page: PDFPage,
    rightX: number,
    centerY: number,
    priorityValue: string,
    colors: {
      border: ReturnType<typeof rgb>;
      textMuted: ReturnType<typeof rgb>;
      customFieldBg: ReturnType<typeof rgb>;
    },
    fontBold: PDFFont
  ): { width: number; height: number } {
    const paddingX = 6;
    const paddingY = 3;
    const labelSize = 6;
    const valueSize = 8;
    const label = 'PRIORITY:';
    const { width: badgeWidth, height: badgeHeight } = this.getPriorityMetaBadgeMetrics(
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

  private getNotesText(description: string | null | undefined): string {
    if (!description) return '';
    const trimmed = description.trim();
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      return normalizePdfNotesText(trimmed);
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        const text = parsed.Text ?? '';
        if (text && typeof text === 'string' && text.trim()) {
          return normalizePdfNotesText(text);
        }
        return '';
      }
    } catch (e) {
      // Fallback
    }

    return normalizePdfNotesText(trimmed);
  }

  private collectCustomFieldBadges(item: {
    Description?: string | null;
    Metadata?: {
      CustomFields?: {
        Predefined?: Record<string, string | null>;
        UserDefined?: Record<string, string>;
      };
    } | null;
  }): string[] {
    const badges: string[] = [];

    const pushFields = (customFields: {
      Predefined?: Record<string, string | null>;
      UserDefined?: Record<string, string>;
    } | undefined) => {
      if (!customFields) return;
      const predefined = customFields.Predefined ?? {};
      for (const [key, val] of Object.entries(predefined)) {
        if (val != null && String(val).trim()) {
          const label = this.formatPredefinedKeyToLabel(key);
          badges.push(`${label}: ${String(val).trim()}`);
        }
      }
      const userDefined = customFields.UserDefined ?? {};
      for (const [name, val] of Object.entries(userDefined)) {
        if (val != null && typeof val === 'string' && val.trim()) {
          badges.push(`${name}: ${val.trim()}`);
        }
      }
    };

    if (item.Metadata?.CustomFields) {
      pushFields(item.Metadata.CustomFields);
      return badges;
    }

    if (item.Description) {
      const trimmed = item.Description.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object') {
            pushFields(parsed.CustomFields);
          }
        } catch {
          // Ignore malformed description JSON
        }
      }
    }

    return badges;
  }

  private formatPredefinedKeyToLabel(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  private parseHslToRgbColor(hslStr: string) {
    const match = hslStr.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i);
    if (match && match[1] !== undefined && match[2] !== undefined && match[3] !== undefined) {
      const h = parseInt(match[1], 10);
      const s = parseInt(match[2], 10);
      const l = parseInt(match[3], 10);
      const [r, g, b] = this.hslToRgb(h, s, l);
      return rgb(r, g, b);
    }
    return rgb(0.37, 0.42, 0.82);
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0), f(8), f(4)];
  }
}
