export type AiModelSlot = 'fast' | 'intelligent';

export interface AiModelConfig {
  AiFastModel?: string;
  AiIntelligentModel?: string;
  /** @deprecated one-shot migration source only */
  AiModel?: string;
}

export function resolveAiModel(config: AiModelConfig, slot: AiModelSlot): string {
  if (slot === 'intelligent') {
    return (config.AiIntelligentModel || '').trim();
  }
  return (config.AiFastModel || '').trim();
}
