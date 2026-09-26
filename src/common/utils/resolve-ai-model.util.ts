import type { AiModelConfig } from './interfaces/ai-model-config.interface';
import type { AiModelSlot } from './types/ai-model-slot.type';

export function resolveAiModel(config: AiModelConfig, slot: AiModelSlot): string {
  if (slot === 'intelligent') {
    return (config.AiIntelligentModel || '').trim();
  }
  return (config.AiFastModel || '').trim();
}
