import { describe, expect, test } from 'bun:test';
import {
  estimateImportRowCount,
  formatAiImportChunkFailureWarning,
  formatAiImportAllChunksFailedError,
  formatAiImportUnderCountWarning,
  isAiImportUnderCount,
  mergeAiImportItems,
  shouldChunkAiImportContent,
  splitAiImportFileContent,
} from '../src/modules/item/domain/chunk-ai-import-content.util';
import {
  clampAiImportChunkItemLimit,
  DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT,
  AI_IMPORT_CHUNK_ITEM_LIMIT_MAX,
  AI_IMPORT_CHUNK_ITEM_LIMIT_MIN,
  normalizeAiImportChunkingEnabled,
  toSystemSettingsView,
} from '../src/modules/system/domain/server-config.entity';

describe('chunk-ai-import-content', () => {
  test('small file stays single-shot at default item limit', () => {
    const content = '# Sheet: Gifts\nName\tUrl\nMug\thttps://a.example/1\n';
    expect(shouldChunkAiImportContent(content)).toBe(false);
    expect(splitAiImportFileContent(content)).toEqual([content]);
  });

  test('disabled chunking keeps full content as one shot', () => {
    const lines = ['# Sheet: Main', 'Name\tLink'];
    for (let i = 0; i < 50; i++) {
      lines.push(`Gift ${i}\thttps://shop.example/p/${i}`);
    }
    const content = lines.join('\n');
    expect(shouldChunkAiImportContent(content, { enabled: false, itemLimit: 10 })).toBe(false);
    expect(splitAiImportFileContent(content, { enabled: false, itemLimit: 10 })).toEqual([
      content,
    ]);
  });

  test('splits by item limit and preserves sheet header context', () => {
    const lines = ['# Sheet: Main', 'Name\tLink'];
    for (let i = 0; i < 45; i++) {
      lines.push(`Gift ${i}\thttps://shop.example/p/${i}`);
    }
    const content = lines.join('\n');
    expect(shouldChunkAiImportContent(content, { enabled: true, itemLimit: 20 })).toBe(true);
    const chunks = splitAiImportFileContent(content, { enabled: true, itemLimit: 20 });
    expect(chunks.length).toBe(3);
    for (const chunk of chunks) {
      expect(chunk).toContain('# Sheet: Main');
      expect(chunk).toContain('Name\tLink');
    }
    expect(chunks[0]).toContain('Gift 0\t');
    expect(chunks[0]).toContain('Gift 19\t');
    expect(chunks[0]).not.toContain('Gift 20\t');
    expect(chunks[1]).toContain('Gift 20\t');
    expect(chunks[2]).toContain('Gift 44\t');
  });

  test('mergeAiImportItems dedupes by name+link', () => {
    const merged = mergeAiImportItems([
      [
        { name: 'Mug', websiteLink: 'https://a.example/1' },
        { name: 'Tee', websiteLink: 'https://a.example/2' },
      ],
      [
        { name: 'Mug', websiteLink: 'https://a.example/1' },
        { name: 'Hat', websiteLink: 'https://a.example/3' },
      ],
    ]);
    expect(merged.map((item) => item.name)).toEqual(['Mug', 'Tee', 'Hat']);
  });

  test('estimateImportRowCount skips sheet banners and header-like rows', () => {
    const content = [
      '# Sheet: Toys',
      'Category\tItem\tWebsite Link',
      'Toys\tLego\thttps://example.com/1',
      'Toys\tBlocks\thttps://example.com/2',
    ].join('\n');
    expect(estimateImportRowCount(content)).toBe(2);
  });

  test('under-count warning threshold', () => {
    expect(isAiImportUnderCount(2, 40)).toBe(true);
    expect(isAiImportUnderCount(20, 40)).toBe(false);
    expect(formatAiImportUnderCountWarning(2, 40)).toContain('only 2 items from ~40 rows');
  });

  test('chunk failure warning and all-chunks-failed error copy', () => {
    expect(formatAiImportChunkFailureWarning(1, 3)).toBe(
      '1 of 3 AI import chunks failed; results may be incomplete.'
    );
    expect(formatAiImportChunkFailureWarning(1, 1)).toBe(
      '1 of 1 AI import chunk failed; results may be incomplete.'
    );
    expect(formatAiImportAllChunksFailedError(3)).toBe('All 3 AI import chunks failed.');
  });
});

describe('AiImportChunk settings clamps', () => {
  test('clampAiImportChunkItemLimit', () => {
    expect(clampAiImportChunkItemLimit(0)).toBe(AI_IMPORT_CHUNK_ITEM_LIMIT_MIN);
    expect(clampAiImportChunkItemLimit(999)).toBe(AI_IMPORT_CHUNK_ITEM_LIMIT_MAX);
    expect(clampAiImportChunkItemLimit(20)).toBe(20);
    expect(clampAiImportChunkItemLimit('nope')).toBe(DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT);
  });

  test('normalizeAiImportChunkingEnabled defaults true', () => {
    expect(normalizeAiImportChunkingEnabled(undefined)).toBe(true);
    expect(normalizeAiImportChunkingEnabled(false)).toBe(false);
    expect(normalizeAiImportChunkingEnabled(true)).toBe(true);
  });

  test('toSystemSettingsView exposes import chunk fields', () => {
    const view = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
      AiImportChunkingEnabled: false,
      AiImportChunkItemLimit: 8,
    });
    expect(view.AiImportChunkingEnabled).toBe(false);
    expect(view.AiImportChunkItemLimit).toBe(8);

    const defaults = toSystemSettingsView({
      DbType: 'local',
      SmtpType: 'local',
    });
    expect(defaults.AiImportChunkingEnabled).toBe(true);
    expect(defaults.AiImportChunkItemLimit).toBe(DEFAULT_AI_IMPORT_CHUNK_ITEM_LIMIT);
  });
});
