import { AppError } from '@/common/middlewares/error.middleware';
import { resolveAiConnection } from '@/common/utils/resolve-ai-connection.util';
import { ownerPolicyAllowsAiExtraction } from '@/common/application/user-ai-access.util';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { ServerConfigRepository } from '@/modules/system/domain/ports/server-config.repository';
import type { ItemRepository } from '../domain/ports/item.repository';
import type { ImportFileTextExtractor } from '../domain/ports/import-file-text-extractor.port';
import type { ItemImportParser } from '../domain/ports/item-import-parser.port';
import type {
  ImportContentEncoding,
} from '../domain/ports/import-file-text-extractor.port';
import type {
  ImportFileFormat,
  ImportPreviewResult,
} from '../domain/imported-item-preview';
import { tryParseGiftistryExportDeterministic } from '../domain/try-parse-giftistry-export';
import { resolveItemCategory } from '../domain/resolve-item-category.util';
import { resolveDesiredQuantity } from '../domain/parse-pack-quantity.util';
import type { ImportedItemPreview } from '../domain/imported-item-preview';

export interface ParseImportPreviewInput {
  listId?: string;
  fileName: string;
  format?: ImportFileFormat;
  content: string;
  contentEncoding: ImportContentEncoding;
}

export class ParseImportPreviewUseCase {
  constructor(
    private textExtractor: ImportFileTextExtractor,
    private importParser: ItemImportParser,
    private wishlistRepo: WishlistRepository,
    private itemRepo: ItemRepository,
    private userRepo: UserRepository,
    private assertUserCan: AssertUserCanUseCase,
    private configRepo: ServerConfigRepository
  ) {}

  async execute(userId: string, input: ParseImportPreviewInput): Promise<ImportPreviewResult> {
    if (!input.fileName?.trim()) {
      throw new AppError('File name is required', 400, 'BAD_REQUEST');
    }
    if (!input.content) {
      throw new AppError('File content is required', 400, 'BAD_REQUEST');
    }

    let wishlistTitle = '';
    let existingCategoryList: string[] = [];

    if (input.listId) {
      const wishlist = await this.wishlistRepo.findById(input.listId);
      if (!wishlist) {
        throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
      }
      wishlistTitle = wishlist.Title || '';
      const items = await this.itemRepo.findByListId(input.listId);
      existingCategoryList = Array.from(
        new Set(
          items
            .map((item) => item.Category)
            .filter((category): category is string => !!category && category !== 'uncategorized')
        )
      );
    }
    const existingCategories = existingCategoryList.join(', ');

    const extracted = await this.textExtractor.extract({
      fileName: input.fileName,
      format: input.format,
      content: input.content,
      contentEncoding: input.contentEncoding,
    });

    const deterministic = tryParseGiftistryExportDeterministic(
      extracted.text,
      extracted.format
    );
    if (deterministic) {
      return {
        ...deterministic,
        items: canonicalizePreviewItems(deterministic.items, existingCategoryList),
        warnings: [...extracted.warnings, ...deterministic.warnings],
        suggestedWishlistTitle:
          deterministic.suggestedWishlistTitle ||
          filenameStemAsTitle(input.fileName),
      };
    }

    await this.assertAiAllowed(userId, input.listId);

    const config = this.configRepo.load();
    const { provider, apiKey, model, endpoint } = resolveAiConnection(config, 'fast');
    if (provider !== 'local' && !apiKey) {
      throw new AppError('AI provider is not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    try {
      const items = await this.importParser.parse(
        {
          fileName: input.fileName,
          format: extracted.format,
          fileContent: extracted.text,
          wishlistTitle,
          existingCategories,
        },
        {
          provider,
          apiKey,
          model,
          customPrompt: config.AiImportPrompt || '',
          endpoint,
        }
      );

      return {
        items: canonicalizePreviewItems(items, existingCategoryList),
        warnings: [
          ...extracted.warnings,
          ...(items.length === 0 ? ['AI could not extract any items from this file.'] : []),
        ],
        sourceFormat: extracted.format,
        parseMode: 'ai',
        suggestedWishlistTitle: filenameStemAsTitle(input.fileName) || wishlistTitle || undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI import failed';
      throw new AppError(message, 502, 'BAD_GATEWAY');
    }
  }

  private async assertAiAllowed(userId: string, listId?: string): Promise<void> {
    const config = this.configRepo.load();
    if (!config.AiEnabled) {
      throw new AppError(
        'AI features are disabled on this server. Giftistry JSON/CSV can still import without AI.',
        403,
        'FORBIDDEN'
      );
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    if (user.AiEnabled === false) {
      throw new AppError('AI features are disabled on your profile', 403, 'FORBIDDEN');
    }

    await this.assertUserCan.execute(userId, 'CanUseAiFeatures');

    if (listId) {
      const wishlist = await this.wishlistRepo.findById(listId);
      if (!wishlist) {
        throw new AppError('Wishlist not found', 404, 'NOT_FOUND');
      }
      if (!wishlist.AiEnabled) {
        throw new AppError('AI features are disabled for this wishlist', 403, 'FORBIDDEN');
      }
      const ownerAllowsAi = await ownerPolicyAllowsAiExtraction(
        wishlist.UserId,
        this.userRepo,
        this.assertUserCan
      );
      if (!ownerAllowsAi) {
        throw new AppError('AI features are not permitted for this wishlist owner', 403, 'FORBIDDEN');
      }
    }
  }
}

function filenameStemAsTitle(fileName: string): string | undefined {
  const base = fileName.split('/').pop() || fileName;
  const stem = base.replace(/\.[^.]+$/, '').trim();
  return stem || undefined;
}

function canonicalizePreviewItems(
  items: ImportedItemPreview[],
  existingCategories: string[]
): ImportedItemPreview[] {
  return items.map((item) => {
    const desiredQuantity =
      resolveDesiredQuantity(item.desiredQuantity, item.name, item.description) ?? undefined;
    return {
      ...item,
      category: item.category
        ? resolveItemCategory(item.category, existingCategories)
        : item.category,
      desiredQuantity,
    };
  });
}
