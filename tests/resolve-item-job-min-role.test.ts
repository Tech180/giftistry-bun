import { describe, expect, test } from 'bun:test';
import {
  resolveItemEnrichMinRole,
  resolveItemSummarizeMinRole,
} from '@/modules/jobs/utils/resolve-item-job-min-role.util';

describe('resolveItemEnrichMinRole', () => {
  test('allows viewer for draft-populate', () => {
    expect(resolveItemEnrichMinRole('draft-populate')).toBe('viewer');
  });

  test('allows viewer for update-item', () => {
    expect(resolveItemEnrichMinRole('update-item')).toBe('viewer');
  });

  test('allows viewer for create-from-url', () => {
    expect(resolveItemEnrichMinRole('create-from-url')).toBe('viewer');
  });
});

describe('resolveItemSummarizeMinRole', () => {
  test('allows viewer when WriteBack is false or omitted', () => {
    expect(resolveItemSummarizeMinRole(false)).toBe('viewer');
    expect(resolveItemSummarizeMinRole(undefined)).toBe('viewer');
  });

  test('requires collaborator when WriteBack is true', () => {
    expect(resolveItemSummarizeMinRole(true)).toBe('collaborator');
  });
});
