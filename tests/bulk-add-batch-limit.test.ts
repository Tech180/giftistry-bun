import { describe, expect, test, mock } from 'bun:test';
import {
  BulkAddItemsUseCase,
  MAX_BULK_ADD_BATCH,
} from '../src/modules/item/application/bulk-add-items.use-case';

describe('BulkAddItemsUseCase batch limit', () => {
  test('exports MAX_BULK_ADD_BATCH of 500', () => {
    expect(MAX_BULK_ADD_BATCH).toBe(500);
  });

  test('rejects more than MAX_BULK_ADD_BATCH items', async () => {
    const useCase = new BulkAddItemsUseCase(
      { execute: mock(() => Promise.resolve({ Id: 'item' })) } as never,
      { execute: mock(() => Promise.resolve([])) } as never
    );

    const items = Array.from({ length: MAX_BULK_ADD_BATCH + 1 }, (_, index) => ({
      name: `Item ${index + 1}`,
    }));

    await expect(useCase.execute('list-1', 'user-1', 'owner', items)).rejects.toMatchObject({
      message: `Cannot import more than ${MAX_BULK_ADD_BATCH} items at once`,
      statusCode: 400,
    });
  });
});
