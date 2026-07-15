import { PDFDocument, StandardFonts, PDFString, PDFName, rgb } from 'pdf-lib';
import type { PdfGenerator } from '../application/ports/pdf-generator.port';
import type { ThemeColors } from '../application/ports/theme-resolver.port';
import type { Wishlist } from '../domain/wishlist.entity';

function toPdfLibColor(c: { red: number; green: number; blue: number }) {
  return rgb(c.red, c.green, c.blue);
}

export class PdfLibGenerator implements PdfGenerator {
  async generateWishlistPdf(
    wishlist: Wishlist,
    items: any[],
    themeColors: ThemeColors,
    ownerInfo: { name: string; username: string; avatarUrl?: string }
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

      const paragraphs = text.split('\n');

      for (const para of paragraphs) {
        const words = para.split(' ');
        let currentLine = '';
        const lines: string[] = [];

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const width = txtFont.widthOfTextAtSize(testLine, size);
          if (width > maxWidth) {
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
    await drawText(wishlist.Title.toUpperCase(), {
      font: fontBold,
      size: 18,
      color: colors.text,
      maxWidth: CONTENT_WIDTH - 120,
    });

    // Draw metadata details
    const expiresText = wishlist.ExpiresAt
      ? `Expires: ${new Date(wishlist.ExpiresAt).toLocaleDateString()}`
      : 'No expiration date';
    await drawText(expiresText, {
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
    currentY.y -= 20;

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

    for (const cat of categories) {
      const displayCategory = cat === 'uncategorized' ? 'General Items' : cat.charAt(0).toUpperCase() + cat.slice(1);

      // Draw category section heading
      await drawText(displayCategory.toUpperCase(), {
        font: fontBold,
        size: 13,
        color: colors.primary, // Primary brand color
        marginTop: 15,
      });

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

        if (hasPrice || hasLink || hasPriority) {
          // Subtract margin top first
          currentY.y -= 6;

          // Page break check
          if (currentY.y - 13.75 < MARGIN_BOTTOM) {
            pageRef.current = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            currentY.y = PAGE_HEIGHT - MARGIN_TOP;
          }

          let badgeX = PAGE_WIDTH - MARGIN_RIGHT;

          // 1. Draw Price Badge if present
          if (hasPrice) {
            const paddingX = 6;
            const paddingY = 2.5;
            const fontSize = 9;
            const textWidth = fontBold.widthOfTextAtSize(priceText, fontSize);
            const badgeWidth = textWidth + paddingX * 2;
            const badgeHeight = fontSize + paddingY * 2;
            badgeX = PAGE_WIDTH - MARGIN_RIGHT - badgeWidth;
            const badgeY = currentY.y - 5.5 - badgeHeight / 2;

            // Draw the price badge background
            pageRef.current.drawRectangle({
              x: badgeX,
              y: badgeY,
              width: badgeWidth,
              height: badgeHeight,
              color: colors.successBg,
              borderColor: colors.successBorder,
              borderWidth: 0.5,
            });

            // Draw the price text inside the badge
            pageRef.current.drawText(priceText, {
              x: badgeX + paddingX,
              y: badgeY + paddingY + 0.5,
              size: fontSize,
              font: fontBold,
              color: colors.success,
            });
          }

          let linkX = PAGE_WIDTH - MARGIN_RIGHT;

          // 2. Draw Link if present
          if (hasLink && firstLink) {
            const linkText = firstLink.RetailerName || 'Link';
            const linkTextWidth = fontBold.widthOfTextAtSize(linkText, 9);
            
            if (hasPrice) {
              linkX = badgeX - 10 - linkTextWidth;
            } else {
              linkX = PAGE_WIDTH - MARGIN_RIGHT - linkTextWidth;
            }

            const linkY = currentY.y - 5.5 - 9 / 2;

            // Draw link text
            pageRef.current.drawText(linkText, {
              x: linkX,
              y: linkY + 0.5,
              size: 9,
              font: fontBold,
              color: colors.primary,
            });

            // Underline
            pageRef.current.drawLine({
              start: { x: linkX, y: linkY - 1 },
              end: { x: linkX + linkTextWidth, y: linkY - 1 },
              thickness: 0.8,
              color: colors.primary,
            });

            // Create annotation
            if (firstLink.Url) {
              const linkAnnotation = pdfDoc.context.register(
                pdfDoc.context.obj({
                  Type: 'Annot',
                  Subtype: 'Link',
                  Rect: [
                    linkX,
                    linkY - 2,
                    linkX + linkTextWidth,
                    linkY + 9,
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

          let priX = PAGE_WIDTH - MARGIN_RIGHT;

          // 3. Draw Priority Badge if present (only the number)
          if (hasPriority) {
            const paddingX = 6;
            const paddingY = 2.5;
            const fontSize = 9;
            const priTextWidth = fontBold.widthOfTextAtSize(priorityText, fontSize);
            const priBadgeWidth = priTextWidth + paddingX * 2;
            const priBadgeHeight = fontSize + paddingY * 2;

            if (hasLink) {
              priX = linkX - 10 - priBadgeWidth;
            } else if (hasPrice) {
              priX = badgeX - 10 - priBadgeWidth;
            } else {
              priX = PAGE_WIDTH - MARGIN_RIGHT - priBadgeWidth;
            }

            const priY = currentY.y - 5.5 - priBadgeHeight / 2;

            // Draw the priority badge background
            pageRef.current.drawRectangle({
              x: priX,
              y: priY,
              width: priBadgeWidth,
              height: priBadgeHeight,
              color: colors.warningBg,
              borderColor: colors.warningBorder,
              borderWidth: 0.5,
            });

            // Draw the priority number text inside the badge
            pageRef.current.drawText(priorityText, {
              x: priX + paddingX,
              y: priY + paddingY + 0.5,
              size: fontSize,
              font: fontBold,
              color: colors.warning,
            });
          }

          // 4. Draw item name (marginTop: 0 because we already subtracted it)
          const leftBound = hasPriority ? priX : (hasLink ? linkX : badgeX);
          await drawText(`•  ${starPrefix}${item.Name}`, {
            font: fontBold,
            size: 11,
            color: colors.text,
            marginTop: 0,
            maxWidth: leftBound - MARGIN_LEFT - 12,
          });
        } else {
          // Draw item name normally if there's no price, link, or priority
          await drawText(`•  ${starPrefix}${item.Name}`, {
            font: fontBold,
            size: 11,
            color: colors.text,
            marginTop: 6,
          });
        }

        // Description/Notes
        const notesText = this.getNotesText(item.Description);
        if (notesText) {
          await drawText(`Notes: ${notesText}`, {
            font: fontItalic,
            size: 9.5,
            color: colors.textMuted,
            indent: 12,
            marginTop: 2,
          });
        }

        // Gather badges
        const badges: Array<{ text: string; bg?: any; fg?: any }> = [];

        // Custom Fields Badges
        if (item.Description) {
          const trimmed = item.Description.trim();
          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed && typeof parsed === 'object') {
                // Predefined
                const predefined = parsed.CustomFields?.Predefined ?? {};
                for (const [key, val] of Object.entries(predefined)) {
                  if (val != null && String(val).trim()) {
                    const label = this.formatPredefinedKeyToLabel(key);
                    badges.push({ text: `${label}: ${String(val).trim()}` });
                  }
                }
                // UserDefined
                const userDefined = parsed.CustomFields?.UserDefined ?? {};
                for (const [name, val] of Object.entries(userDefined)) {
                  if (val != null && typeof val === 'string' && val.trim()) {
                    badges.push({ text: `${name}: ${val.trim()}` });
                  }
                }
              }
            } catch (e) {}
          }
        }

        // Draw Badges Row
        if (badges.length > 0) {
          const paddingX = 6;
          const paddingY = 2.5;
          const fontSize = 8;
          const badgeHeight = fontSize + paddingY * 2;
          const spaceX = 5;
          const spaceY = 4;

          let startX = MARGIN_LEFT + 12;
          const endX = PAGE_WIDTH - MARGIN_RIGHT;

          currentY.y -= 4; // Margin top for badges row

          for (const badge of badges) {
            const textWidth = font.widthOfTextAtSize(badge.text, fontSize);
            const badgeWidth = textWidth + paddingX * 2;

            // Wrap line if badges exceed CONTENT_WIDTH
            if (startX + badgeWidth > endX) {
              startX = MARGIN_LEFT + 12;
              currentY.y -= (badgeHeight + spaceY);
            }

            // Page break check
            if (currentY.y - badgeHeight < MARGIN_BOTTOM) {
              pageRef.current = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
              currentY.y = PAGE_HEIGHT - MARGIN_TOP;
              startX = MARGIN_LEFT + 12;
            }

            const bg = badge.bg || colors.customFieldBg;
            const fg = badge.fg || colors.customFieldText;
            const borderColor = colors.customFieldBorder;

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

        // Claims / Purchase status
        if (item.IsClaimed) {
          const claimNames = item.Claims?.map((c: any) => c.ClaimedByName).filter(Boolean).join(', ') || 'Someone';
          await drawText(`Status: Claimed by ${claimNames}`, {
            font: fontBold,
            size: 9.5,
            color: colors.success, // Success color for claimed/purchased status
            indent: 12,
            marginTop: 2,
          });
        }

        currentY.y -= 4; // Space between items
      }

      currentY.y -= 8; // Space between categories
    }

    return await pdfDoc.save();
  }

  private getNotesText(description: string | null | undefined): string {
    if (!description) return '';
    const trimmed = description.trim();
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      return trimmed;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        const text = parsed.Text ?? parsed.text ?? '';
        if (text && typeof text === 'string' && text.trim()) {
          return text.trim();
        }
        return '';
      }
    } catch (e) {
      // Fallback
    }

    return trimmed;
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
