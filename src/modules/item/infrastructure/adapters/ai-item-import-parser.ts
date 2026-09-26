import type { ItemImportParser } from '../../domain/ports/item-import-parser.port';
import type { ItemImportParserConfig } from '../../domain/interfaces/item-import-parser-config.interface';
import type { ItemImportParserInput } from '../../domain/interfaces/item-import-parser-input.interface';
import type { ItemImportParserProgress } from '../../domain/interfaces/item-import-parser-progress.interface';
import type { ItemImportParserResult } from '../../domain/interfaces/item-import-parser-result.interface';
import { AI_IMPORT_MAX_TOKENS } from '../../constants/ai-import-limits.constant';
import { parseAiImportChunks } from '../../domain/utils/parse-ai-import-chunks.util';
import { compileImportPrompt } from '../utils/compile-import-prompt.util';
import {
  extractImportJsonObject,
  mapAiImportItems,
} from '../utils/map-ai-import-items.util';
import { completeTextPromptStream } from '../utils/ai-text-completion.util';

export class AiItemImportParser implements ItemImportParser {
  async parse(
    input: ItemImportParserInput,
    config: ItemImportParserConfig,
    onProgress?: (progress: ItemImportParserProgress) => void | Promise<void>
  ): Promise<ItemImportParserResult> {
    const result = await parseAiImportChunks(
      input.fileContent,
      {
        enabled: config.chunkingEnabled,
        itemLimit: config.chunkItemLimit,
      },
      async (chunk, meta) => {
        const prompt = compileImportPrompt(config.customPrompt, {
          ...input,
          fileContent: chunk,
        });
        const completion = await completeTextPromptStream(
          prompt,
          {
            provider: config.provider,
            apiKey: config.apiKey,
            model: config.model,
            endpoint: config.endpoint,
            jsonResponse: true,
            maxTokens: AI_IMPORT_MAX_TOKENS,
          },
          async (delta) => {
            await onProgress?.({
              tokensPerSecond: delta.tokensPerSecond,
              chunkIndex: meta.index,
              chunkTotal: meta.total,
            });
          }
        );
        const parsed = extractImportJsonObject(completion.text);
        return mapAiImportItems(parsed);
      }
    );

    return {
      items: result.items,
      warnings: result.warnings,
    };
  }
}
