import type { AiProvider } from '../types/ai-provider.type';

export function normalizeAiProvider(value: unknown): AiProvider {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  return raw === 'local' ? 'local' : 'openrouter';
}
