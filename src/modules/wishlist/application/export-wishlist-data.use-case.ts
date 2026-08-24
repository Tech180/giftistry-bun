import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { ListItemsUseCase } from '@/modules/item/application/list-items.use-case';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import { AppError } from '@/common/middlewares/error.middleware';
import { parseItemDescription } from '@/modules/item/domain/item-description.util';
import { formatCategoryLabel } from '@/modules/item/domain/format-category-label.util';
import { sortWishlistItemsByExportOrder } from '@/modules/item/domain/sort-wishlist-items.util';
import {
  getLinkedItemIdsFromExportItem,
  getRelatedItemIdsFromExportItem,
  resolveRelationPeerNames,
  type RelationExportItem,
} from '@/modules/item/domain/resolve-item-relations.util';
import ExcelJS from 'exceljs';

export interface WishlistExportResult {
  filename: string;
  contentType: string;
  data: string | Uint8Array;
}

const escapeCsvValue = (val: any) => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

const toPascalCase = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/[^a-zA-Z0-9\s-_]+/g, '')
    .split(/[\s-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
};

const getFormattedDate = (): string => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${mm}${dd}${yyyy}`;
};

const getExportFilename = (title: string, exporterName: string | undefined, ext: string): string => {
  const pascalTitle = toPascalCase(title) || 'Wishlist';
  const dateStr = getFormattedDate();
  const exporterClean = toPascalCase(exporterName || 'Export');
  return `${pascalTitle}_${dateStr}_${exporterClean}.${ext}`;
};

function getAudienceDisplayName(user: any): string {
  const first = user.FirstName?.trim();
  const last = user.LastName?.trim();
  if (first || last) {
    return `${first || ''} ${last || ''}`.trim();
  }
  return user.Username || user.Email || 'User';
}

function formatAudienceForExport(
  sharedWith: any[] | undefined,
  currentUserId?: string,
  suggestedByUserId?: string | null
): string {
  if (!sharedWith || sharedWith.length === 0) {
    return 'Everyone';
  }
  if (
    sharedWith.length === 1 &&
    currentUserId &&
    suggestedByUserId &&
    sharedWith[0].UserId === suggestedByUserId &&
    currentUserId === suggestedByUserId
  ) {
    return 'Only Me';
  }
  return sharedWith.map(getAudienceDisplayName).join(', ');
}

function formatSuggestionForExport(item: any, isOwner: boolean): string {
  if (isOwner) {
    return '';
  }
  if (item.IsSuggestion) {
    return item.SuggestedByUsername || 'Collaborator';
  }
  if (item.IsHiddenIdea) {
    return 'Hidden suggestion';
  }
  return '';
}

function getSiteName(urlStr: string): string {
  try {
    const urlObj = new URL(urlStr);
    const hostname = urlObj.hostname;
    const clean = hostname.replace('www.', '').split('.')[0] || '';
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Store';
  } catch {
    return 'Store';
  }
}

function buildRelationNameById(items: RelationExportItem[]): Map<string, string> {
  const nameById = new Map<string, string>();
  for (const item of items) {
    const name = typeof item.Name === 'string' ? item.Name.trim() : '';
    if (name) nameById.set(item.Id, name);
  }
  return nameById;
}

function formatLinkedItemsForExport(
  itemId: string,
  items: RelationExportItem[],
  nameById: Map<string, string>
): string {
  return resolveRelationPeerNames(itemId, items, nameById, getLinkedItemIdsFromExportItem).join(', ');
}

function formatRelatedItemsForExport(
  itemId: string,
  items: RelationExportItem[],
  nameById: Map<string, string>
): string {
  return resolveRelationPeerNames(itemId, items, nameById, getRelatedItemIdsFromExportItem).join(', ');
}

export class ExportWishlistDataUseCase {
  constructor(
    private wishlistRepo: WishlistRepository,
    private listItemsUseCase: ListItemsUseCase,
    private userRepo: UserRepository
  ) {}

  async execute(
    listId: string,
    currentUserId: string,
    format: 'csv' | 'xlsx' | 'txt' | 'json'
  ): Promise<WishlistExportResult> {
    const wishlist = await this.wishlistRepo.findById(listId);
    if (!wishlist) {
      throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
    }

    const { Items } = await this.listItemsUseCase.execute(listId, currentUserId);
    const activeUser = await this.userRepo.findById(currentUserId);
    const exporterName = activeUser ? getAudienceDisplayName(activeUser) : undefined;
    const isOwner = currentUserId === wishlist.UserId;

    const exportContext = {
      exporterName,
      isOwner,
      currentUserId,
    };

    const sorted = this.getSortedItemsWithPriority(Items);
    const includeSuggestionColumn = !isOwner;
    const relationItems = sorted as RelationExportItem[];
    const relationNameById = buildRelationNameById(relationItems);

    switch (format) {
      case 'csv': {
        const headers = [
          'Category',
          'Priority',
          'Item',
          'Star',
          'Price',
          'Website Link',
          'Description',
          'Audience',
          ...(includeSuggestionColumn ? ['Suggestion'] : []),
          'Linked Items',
          'Related Items',
        ];
        const rows: any[][] = [];
        const emptyRow = headers.map(() => '');

        const categoryGroups: { [key: string]: any[] } = {};
        for (const item of sorted) {
          if (!categoryGroups[item.categoryFormatted]) {
            categoryGroups[item.categoryFormatted] = [];
          }
          categoryGroups[item.categoryFormatted].push(item);
        }

        const categories = Object.keys(categoryGroups).sort((a, b) => {
          if (a === 'Uncategorized') return 1;
          if (b === 'Uncategorized') return -1;
          return a.localeCompare(b);
        });

        for (const cat of categories) {
          rows.push([`${cat}:`, ...headers.slice(1).map(() => '')]);

          const catItems = categoryGroups[cat];
          for (const item of catItems) {
            const priorityVal = item.Priority !== null && item.Priority !== undefined ? item.Priority : '';
            const starVal = item.isFav ? '*' : '';
            const parsed = parseItemDescription(item.Description);
            const formattedDesc = parsed.text || '';
            const audience = formatAudienceForExport(item.SharedWith, exportContext.currentUserId, item.SuggestedByUserId);
            const suggestion = includeSuggestionColumn
              ? formatSuggestionForExport(item, exportContext.isOwner)
              : null;
            const linkedItems = formatLinkedItemsForExport(item.Id, relationItems, relationNameById);
            const relatedItems = formatRelatedItemsForExport(item.Id, relationItems, relationNameById);

            const appendMeta = (row: any[]) => {
              const withSuggestion = includeSuggestionColumn ? [...row, suggestion] : row;
              return [...withSuggestion, linkedItems, relatedItems];
            };

            if (item.Links && item.Links.length > 0) {
              for (const link of item.Links) {
                const priceVal = link.ExtractedPrice !== null && link.ExtractedPrice !== undefined
                  ? `$${link.ExtractedPrice.toFixed(2)}`
                  : '';
                rows.push(appendMeta([
                  '',
                  priorityVal,
                  item.Name,
                  starVal,
                  priceVal,
                  link.Url || '',
                  formattedDesc,
                  audience,
                ]));
              }
            } else {
              rows.push(appendMeta([
                '',
                priorityVal,
                item.Name,
                starVal,
                '',
                '',
                formattedDesc,
                audience,
              ]));
            }
          }
          rows.push(emptyRow);
        }

        const csvContent = [
          headers.map(escapeCsvValue).join(','),
          ...rows.map(row => row.map(escapeCsvValue).join(',')),
        ].join('\r\n');

        return {
          filename: getExportFilename(wishlist.Title, exporterName, 'csv'),
          contentType: 'text/csv;charset=utf-8;',
          data: csvContent,
        };
      }

      case 'xlsx': {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Wishlist');

        worksheet.getColumn(1).width = 18;
        worksheet.getColumn(2).width = 12;
        worksheet.getColumn(3).width = 28;
        worksheet.getColumn(4).width = 8;
        worksheet.getColumn(5).width = 12;
        worksheet.getColumn(6).width = 18;
        worksheet.getColumn(7).width = 45;
        worksheet.getColumn(8).width = 18;
        let nextCol = 9;
        if (includeSuggestionColumn) {
          worksheet.getColumn(nextCol).width = 22;
          nextCol += 1;
        }
        worksheet.getColumn(nextCol).width = 28;
        worksheet.getColumn(nextCol + 1).width = 28;

        const headers = [
          'Category',
          'Priority',
          'Item',
          'Star',
          'Price',
          'Website',
          'Description',
          'Audience',
          ...(includeSuggestionColumn ? ['Suggestion'] : []),
          'Linked Items',
          'Related Items',
        ];
        const headerRow = worksheet.addRow(headers);
        headerRow.height = 24;
        headerRow.eachCell((cell) => {
          cell.font = {
            name: 'Inter',
            size: 11,
            bold: true,
            color: { argb: 'FFFFFFFF' }
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF5E6AD2' }
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'left',
            wrapText: true
          };
        });

        const categoryGroups: { [key: string]: any[] } = {};
        for (const item of sorted) {
          if (!categoryGroups[item.categoryFormatted]) {
            categoryGroups[item.categoryFormatted] = [];
          }
          categoryGroups[item.categoryFormatted].push(item);
        }

        const categories = Object.keys(categoryGroups).sort((a, b) => {
          if (a === 'Uncategorized') return 1;
          if (b === 'Uncategorized') return -1;
          return a.localeCompare(b);
        });

        for (const cat of categories) {
          if (worksheet.rowCount > 1) {
            worksheet.addRow([]);
          }

          const catRow = worksheet.addRow([`${cat}:`]);
          catRow.height = 22;
          const catCell = catRow.getCell(1);
          catCell.font = {
            name: 'Inter',
            size: 13,
            bold: true,
            color: { argb: 'FF111111' }
          };
          catCell.alignment = { vertical: 'middle', wrapText: true };

          const catItems = categoryGroups[cat];
          for (const item of catItems) {
            const priorityVal = item.Priority !== null && item.Priority !== undefined ? item.Priority : '';
            const starVal = item.isFav ? '*' : '';
            const parsed = parseItemDescription(item.Description);
            const formattedDesc = parsed.text || '';
            const audience = formatAudienceForExport(item.SharedWith, exportContext.currentUserId, item.SuggestedByUserId);
            const suggestion = includeSuggestionColumn
              ? formatSuggestionForExport(item, exportContext.isOwner)
              : null;
            const linkedItems = formatLinkedItemsForExport(item.Id, relationItems, relationNameById);
            const relatedItems = formatRelatedItemsForExport(item.Id, relationItems, relationNameById);

            let priceVal = '';
            let websiteLabel = '';
            let linkUrl = '';

            if (item.Links && item.Links.length > 0) {
              const link = item.Links[0];
              priceVal = link.ExtractedPrice !== null && link.ExtractedPrice !== undefined
                ? `$${link.ExtractedPrice.toFixed(2)}`
                : '';
              websiteLabel = link.RetailerName || (link.Url ? getSiteName(link.Url) : 'Store');
              linkUrl = link.Url || '';
            }

            const rowValues = [
              '',
              priorityVal,
              item.Name,
              starVal,
              priceVal,
              websiteLabel,
              formattedDesc,
              audience,
              ...(includeSuggestionColumn ? [suggestion] : []),
              linkedItems,
              relatedItems,
            ];
            const itemRow = worksheet.addRow(rowValues);

            itemRow.eachCell((cell, colNumber) => {
              if (colNumber === 6 && linkUrl) {
                cell.value = { text: websiteLabel, hyperlink: linkUrl };
                cell.font = {
                  name: 'Inter',
                  size: 10,
                  color: { argb: 'FF0055FF' },
                  underline: true
                };
              } else {
                cell.font = {
                  name: 'Inter',
                  size: 10,
                  color: { argb: 'FF333333' }
                };
              }
              cell.alignment = {
                vertical: 'middle',
                horizontal: 'left',
                wrapText: true
              };
            });
          }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        return {
          filename: getExportFilename(wishlist.Title, exporterName, 'xlsx'),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          data: new Uint8Array(buffer),
        };
      }

      case 'txt': {
        const sections: string[] = [];
        sections.push('============================================================');
        sections.push(`WISHLIST REGISTRY: ${wishlist.Title.toUpperCase()}`);
        sections.push('============================================================');
        sections.push('');

        const categoryGroups: { [key: string]: any[] } = {};
        for (const item of sorted) {
          if (!categoryGroups[item.categoryFormatted]) {
            categoryGroups[item.categoryFormatted] = [];
          }
          categoryGroups[item.categoryFormatted].push(item);
        }

        const categories = Object.keys(categoryGroups).sort((a, b) => {
          if (a === 'Uncategorized') return 1;
          if (b === 'Uncategorized') return -1;
          return a.localeCompare(b);
        });

        for (const cat of categories) {
          sections.push(`[${cat.toUpperCase()}]`);
          sections.push('-'.repeat(cat.length + 2));

          const catItems = categoryGroups[cat];
          for (const item of catItems) {
            const starPrefix = item.isFav ? '★ ' : '  ';
            const priorityLabel = item.Priority !== null && item.Priority !== undefined ? `(Priority: ${item.Priority})` : '';
            const parsed = parseItemDescription(item.Description);
            const descText = parsed.text || '';
            const descStr = descText ? `\n    Description: ${descText}` : '';
            const audience = formatAudienceForExport(item.SharedWith, exportContext.currentUserId, item.SuggestedByUserId);
            const suggestion = formatSuggestionForExport(item, exportContext.isOwner);
            const linkedItems = formatLinkedItemsForExport(item.Id, relationItems, relationNameById);
            const relatedItems = formatRelatedItemsForExport(item.Id, relationItems, relationNameById);
            const metaStr = `\n    Audience: ${audience}${suggestion ? `\n    Suggestion: ${suggestion}` : ''}${
              linkedItems ? `\n    Linked Items: ${linkedItems}` : ''
            }${relatedItems ? `\n    Related Items: ${relatedItems}` : ''}`;

            if (item.Links && item.Links.length > 0) {
              for (const link of item.Links) {
                const priceStr = link.ExtractedPrice !== null && link.ExtractedPrice !== undefined
                  ? ` - $${link.ExtractedPrice.toFixed(2)}`
                  : '';
                const retailer = link.RetailerName || 'Store';
                sections.push(`${starPrefix}${item.Name}${priceStr} ${priorityLabel}`);
                if (link.Url) {
                  sections.push(`    Link: ${retailer} (${link.Url})`);
                }
                if (descStr) {
                  sections.push(descStr);
                }
                sections.push(metaStr);
              }
            } else {
              sections.push(`${starPrefix}${item.Name} ${priorityLabel}`);
              if (descStr) {
                sections.push(descStr);
              }
              sections.push(metaStr);
            }
            sections.push('');
          }
          sections.push('');
        }

        return {
          filename: getExportFilename(wishlist.Title, exporterName, 'txt'),
          contentType: 'text/plain;charset=utf-8;',
          data: sections.join('\n'),
        };
      }

      case 'json': {
        const formattedItems = sorted.map(item => {
          const parsed = parseItemDescription(item.Description);
          const parsedDesc = parsed.isJson && parsed.metadata ? parsed.metadata : item.Description;
          const audience = formatAudienceForExport(item.SharedWith, exportContext.currentUserId, item.SuggestedByUserId);
          const suggestion = includeSuggestionColumn
            ? formatSuggestionForExport(item, exportContext.isOwner)
            : '';
          const linkedItems = resolveRelationPeerNames(
            item.Id,
            relationItems,
            relationNameById,
            getLinkedItemIdsFromExportItem
          );
          const relatedItems = resolveRelationPeerNames(
            item.Id,
            relationItems,
            relationNameById,
            getRelatedItemIdsFromExportItem
          );

          return {
            name: item.Name,
            category: item.categoryFormatted,
            priority: item.Priority,
            isFavorite: item.isFav,
            description: parsedDesc,
            audience,
            ...(includeSuggestionColumn && suggestion ? { suggestion } : {}),
            ...(linkedItems.length ? { linkedItems } : {}),
            ...(relatedItems.length ? { relatedItems } : {}),
            links: (item.Links || []).map((link: any) => ({
              url: link.Url || '',
              retailer: link.RetailerName || '',
              price: link.ExtractedPrice
            }))
          };
        });

        const data = {
          wishlistTitle: wishlist.Title,
          exportedAt: new Date().toISOString(),
          items: formattedItems
        };

        return {
          filename: getExportFilename(wishlist.Title, exporterName, 'json'),
          contentType: 'application/json;charset=utf-8;',
          data: JSON.stringify(data, null, 2),
        };
      }
    }
  }

  private getSortedItemsWithPriority(items: any[]) {
    return sortWishlistItemsByExportOrder(
      items.map((item) => ({
        ...item,
        // Prefer list DTO Metadata (includes Linked/Related from first-class columns).
        // Description is often plain text after list-items resolution.
        Metadata: item.Metadata ?? parseItemDescription(item.Description).metadata,
      }))
    ).map((item) => ({
      ...item,
      categoryFormatted: formatCategoryLabel(item.Category || 'uncategorized'),
      isFav: !!(
        item.IsFavorite ||
        item.IsPinned ||
        item.Metadata?.IsFavorite ||
        item.Metadata?.IsPinned
      ),
    }));
  }
}
