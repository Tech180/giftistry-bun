import { describe, expect, test } from 'bun:test';
import { parseAiImportChunks } from '../src/modules/item/domain/utils/parse-ai-import-chunks.util';
import {
  formatAiImportAllChunksFailedError,
  formatAiImportChunkFailureWarning,
} from '../src/modules/item/domain/utils/chunk-ai-import-content.util';
import type { ImportedItemPreview } from '../src/modules/item/domain/interfaces/imported-item-preview.interface';

function buildSheetContent(itemCount: number): string {
  const lines = ['# Sheet: Main', 'Name\tLink'];
  for (let i = 0; i < itemCount; i++) {
    lines.push(`Gift ${i}\thttps://shop.example/p/${i}`);
  }
  return lines.join('\n');
}

function item(name: string, link: string): ImportedItemPreview {
  return { name, websiteLink: link };
}

describe('parseAiImportChunks', () => {
  test('single chunk success returns items with no warnings', async () => {
    const content = buildSheetContent(3);
    const result = await parseAiImportChunks(
      content,
      { enabled: true, itemLimit: 20 },
      async () => [item('Gift 0', 'https://shop.example/p/0')]
    );

    expect(result.totalChunks).toBe(1);
    expect(result.failedChunkCount).toBe(0);
    expect(result.warnings).toEqual([]);
    expect(result.items.map((row) => row.name)).toEqual(['Gift 0']);
  });

  test('single chunk failure propagates without swallowing', async () => {
    const content = buildSheetContent(3);
    await expect(
      parseAiImportChunks(content, { enabled: true, itemLimit: 20 }, async () => {
        throw new Error('provider down');
      })
    ).rejects.toThrow('provider down');
  });

  test('multi-chunk all succeed merges items with no warnings', async () => {
    const content = buildSheetContent(45);
    const result = await parseAiImportChunks(
      content,
      { enabled: true, itemLimit: 20 },
      async (chunk, meta) => {
        expect(meta.total).toBe(3);
        const match = chunk.match(/Gift (\d+)/);
        const start = match ? Number(match[1]) : meta.index * 20;
        return [item(`Gift ${start}`, `https://shop.example/p/${start}`)];
      }
    );

    expect(result.totalChunks).toBe(3);
    expect(result.failedChunkCount).toBe(0);
    expect(result.warnings).toEqual([]);
    expect(result.items).toHaveLength(3);
  });

  test('multi-chunk continues when one chunk fails', async () => {
    const content = buildSheetContent(45);
    const result = await parseAiImportChunks(
      content,
      { enabled: true, itemLimit: 20 },
      async (_chunk, meta) => {
        if (meta.index === 1) {
          throw new Error('chunk 2 boom');
        }
        return [item(`Gift ${meta.index}`, `https://shop.example/p/${meta.index}`)];
      }
    );

    expect(result.totalChunks).toBe(3);
    expect(result.failedChunkCount).toBe(1);
    expect(result.warnings).toEqual([formatAiImportChunkFailureWarning(1, 3)]);
    expect(result.items.map((row) => row.name)).toEqual(['Gift 0', 'Gift 2']);
  });

  test('multi-chunk all fail throws explicit error', async () => {
    const content = buildSheetContent(45);
    await expect(
      parseAiImportChunks(content, { enabled: true, itemLimit: 20 }, async () => {
        throw new Error('always fails');
      })
    ).rejects.toThrow(formatAiImportAllChunksFailedError(3));
  });
});
