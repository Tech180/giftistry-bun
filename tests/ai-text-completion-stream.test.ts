import { describe, expect, test } from 'bun:test';
import { computeTokensPerSecond } from '../src/common/domain/utils/compute-tokens-per-second.util';
import {
  consumeSseBuffer,
  estimateTokensFromText,
  extractAnthropicStreamDelta,
  extractGeminiStreamDelta,
  extractOpenAiStreamDelta,
} from '../src/modules/item/infrastructure/utils/ai-text-completion-stream.util';

describe('ai-text-completion-stream helpers', () => {
  test('estimateTokensFromText uses ~4 chars per token', () => {
    expect(estimateTokensFromText('')).toBe(0);
    expect(estimateTokensFromText('abcd')).toBe(1);
    expect(estimateTokensFromText('abcdefgh')).toBe(2);
  });

  test('computeTokensPerSecond rounds from elapsed ms', () => {
    expect(computeTokensPerSecond(0, 1000)).toBeNull();
    expect(computeTokensPerSecond(10, 0)).toBeNull();
    expect(computeTokensPerSecond(10, 1000)).toBe(10);
    expect(computeTokensPerSecond(25, 500)).toBe(50);
  });

  test('consumeSseBuffer splits complete events and keeps remainder', () => {
    const { events, rest } = consumeSseBuffer(
      'data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c"'
    );
    expect(events).toEqual([
      { event: null, data: '{"a":1}' },
      { event: null, data: '{"b":2}' },
    ]);
    expect(rest).toBe('data: {"c"');
  });

  test('extractOpenAiStreamDelta reads content and usage', () => {
    expect(
      extractOpenAiStreamDelta({
        choices: [{ delta: { content: 'Hello' } }],
      })
    ).toEqual({ content: 'Hello' });

    expect(
      extractOpenAiStreamDelta({
        choices: [{ delta: {} }],
        usage: { prompt_tokens: 3, completion_tokens: 7 },
      })
    ).toEqual({ content: '', completionTokens: 7, promptTokens: 3 });
  });

  test('extractAnthropicStreamDelta reads text deltas and usage', () => {
    expect(
      extractAnthropicStreamDelta({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Hi' },
      })
    ).toEqual({ content: 'Hi' });

    expect(
      extractAnthropicStreamDelta({
        type: 'message_delta',
        usage: { output_tokens: 12 },
      })
    ).toEqual({ content: '', completionTokens: 12 });
  });

  test('extractGeminiStreamDelta reads parts and usageMetadata', () => {
    expect(
      extractGeminiStreamDelta({
        candidates: [{ content: { parts: [{ text: 'A' }, { text: 'B' }] } }],
        usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 4 },
      })
    ).toEqual({ content: 'AB', completionTokens: 4, promptTokens: 2 });
  });
});
