import { AppError } from '@/common/domain/errors/app-error';
import { resolveAiConnection } from '@/common/utils/resolve-ai-connection.util';
import { ownerPolicyAllowsAiExtraction } from '@/common/application/utils/user-ai-access.util';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth';
import type { WishlistRepository } from '@/modules/wishlist';
import type { ServerConfigRepository } from '@/modules/system';
import type { ItemRepository } from '../../../domain/ports/item.repository';
import type { ImportFileTextExtractor } from '../../../domain/ports/import-file-text-extractor.port';
import type { ItemImportParser } from '../../../domain/ports/item-import-parser.port';
import type { ImportPreviewResult } from '../../../domain/interfaces/import-preview-result.interface';
import { isGiftistryExportCsv } from '../../../domain/utils/giftistry-export-detect.util';
import { tryParseGiftistryExportDeterministic } from '../../../domain/utils/try-parse-giftistry-export.util';
import { resolveItemCategory } from '../../../domain/utils/resolve-item-category.util';
import { resolveDesiredQuantity } from '../../../domain/utils/parse-pack-quantity.util';
import type { ImportedItemPreview } from '../../../domain/interfaces/imported-item-preview.interface';
import {
  estimateImportRowCount,
  formatAiImportUnderCountWarning,
  isAiImportUnderCount,
} from '../../../domain/utils/chunk-ai-import-content.util';
import { clampAiImportChunkItemLimit } from '@/modules/system';
import { tokensPerSecondRate } from '@/modules/jobs';
import { IMPORT_FORMAT_UNSUPPORTED_MESSAGE } from '../constants/import-format-unsupported-message.constant';
import { XLSX_HEADER_PROBE_ROWS } from '../constants/xlsx-header-probe-rows.constant';
import type { ParseImportPreviewInput } from '../interfaces/parse-import-preview-input.interface';
import type { ParseImportPreviewProgress } from '../interfaces/parse-import-preview-progress.interface';
import { formatFoundMessage } from '../utils/format-found-message.util';
import { isXlsxInput } from '../utils/is-xlsx-input.util';

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

  async execute(
    userId: string,
    input: ParseImportPreviewInput,
    onProgress?: (update: ParseImportPreviewProgress) => void | Promise<void>
  ): Promise<ImportPreviewResult> {
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

    await onProgress?.({ message: 'Reading file…', progressDone: 5 });

    const allowAi = input.allowAi !== false;
    const probeXlsx = !allowAi && isXlsxInput(input.format, input.fileName);

    const extracted = await this.textExtractor.extract({
      fileName: input.fileName,
      format: input.format,
      content: input.content,
      contentEncoding: input.contentEncoding,
      ...(probeXlsx
        ? { maxSheets: 1, maxRowsPerSheet: XLSX_HEADER_PROBE_ROWS }
        : {}),
    });

    await onProgress?.({ message: 'Checking Giftistry format…', progressDone: 20 });

    if (probeXlsx && extracted.format === 'xlsx') {
      if (!isGiftistryExportCsv(extracted.text)) {
        throw new AppError(
          IMPORT_FORMAT_UNSUPPORTED_MESSAGE,
          422,
          'IMPORT_FORMAT_UNSUPPORTED'
        );
      }

      const fullSheet = await this.textExtractor.extract({
        fileName: input.fileName,
        format: input.format,
        content: input.content,
        contentEncoding: input.contentEncoding,
        maxSheets: 1,
      });

      const deterministic = tryParseGiftistryExportDeterministic(
        fullSheet.text,
        fullSheet.format
      );
      if (!deterministic) {
        throw new AppError(
          IMPORT_FORMAT_UNSUPPORTED_MESSAGE,
          422,
          'IMPORT_FORMAT_UNSUPPORTED'
        );
      }

      const items = canonicalizePreviewItems(deterministic.items, existingCategoryList);
      await onProgress?.({
        message: formatFoundMessage(items.length),
        progressDone: 40,
        ProgressRate: null,
      });
      return {
        ...deterministic,
        items,
        warnings: [...fullSheet.warnings, ...deterministic.warnings],
        suggestedWishlistTitle:
          deterministic.suggestedWishlistTitle ||
          filenameStemAsTitle(input.fileName),
        inputTruncated: fullSheet.truncated,
        estimatedRowCount: estimateImportRowCount(fullSheet.text),
      };
    }

    const deterministic = tryParseGiftistryExportDeterministic(
      extracted.text,
      extracted.format
    );
    if (deterministic) {
      const items = canonicalizePreviewItems(deterministic.items, existingCategoryList);
      await onProgress?.({
        message: formatFoundMessage(items.length),
        progressDone: 40,
        ProgressRate: null,
      });
      return {
        ...deterministic,
        items,
        warnings: [...extracted.warnings, ...deterministic.warnings],
        suggestedWishlistTitle:
          deterministic.suggestedWishlistTitle ||
          filenameStemAsTitle(input.fileName),
        inputTruncated: extracted.truncated,
        estimatedRowCount: estimateImportRowCount(extracted.text),
      };
    }

    if (!allowAi) {
      throw new AppError(
        IMPORT_FORMAT_UNSUPPORTED_MESSAGE,
        422,
        'IMPORT_FORMAT_UNSUPPORTED'
      );
    }

    await this.assertAiAllowed(userId, input.listId);

    const config = this.configRepo.load();
    const { provider, apiKey, model, endpoint } = resolveAiConnection(config, 'fast');
    if (provider !== 'local' && !apiKey) {
      throw new AppError('AI provider is not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    await onProgress?.({
      message: 'Asking AI…',
      progressDone: 25,
      ProgressRate: null,
    });

    try {
      const { items, warnings: parserWarnings } = await this.importParser.parse(
        {
          fileName: input.fileName,
          format: extracted.format,
          fileContent: extracted.text,
          wishlistTitle,
          existingCategories,
          optimizeCategories: input.optimizeCategories === true,
        },
        {
          provider,
          apiKey,
          model,
          customPrompt: config.AiImportPrompt || '',
          endpoint,
          chunkingEnabled: config.AiImportChunkingEnabled !== false,
          chunkItemLimit: clampAiImportChunkItemLimit(config.AiImportChunkItemLimit),
        },
        async (progress) => {
          const chunkTotal = progress.chunkTotal ?? 0;
          const chunkIndex = progress.chunkIndex ?? 0;
          const message =
            chunkTotal > 1
              ? `Asking AI (chunk ${chunkIndex + 1}/${chunkTotal})…`
              : 'Asking AI…';
          const progressDone =
            chunkTotal > 1
              ? 25 + Math.round((chunkIndex / chunkTotal) * 15)
              : 30;
          await onProgress?.({
            message,
            progressDone,
            ProgressRate: tokensPerSecondRate(progress.tokensPerSecond),
          });
        }
      );

      const canonical = canonicalizePreviewItems(items, existingCategoryList);
      const estimatedRowCount = estimateImportRowCount(extracted.text);
      const warnings = [
        ...extracted.warnings,
        ...parserWarnings,
        ...(items.length === 0 ? ['AI could not extract any items from this file.'] : []),
      ];
      if (isAiImportUnderCount(canonical.length, estimatedRowCount)) {
        warnings.push(formatAiImportUnderCountWarning(canonical.length, estimatedRowCount));
      }

      await onProgress?.({
        message: formatFoundMessage(canonical.length),
        progressDone: 40,
        ProgressRate: null,
      });

      return {
        items: canonical,
        warnings,
        sourceFormat: extracted.format,
        parseMode: 'ai',
        suggestedWishlistTitle: filenameStemAsTitle(input.fileName) || wishlistTitle || undefined,
        inputTruncated: extracted.truncated,
        estimatedRowCount,
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
