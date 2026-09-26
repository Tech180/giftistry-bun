import { normalizeAiProvider } from '@/modules/system';
import { getEnv } from '@/common/config/utils/get-env.util';
import type { AiConnectionConfig } from './interfaces/ai-connection-config.interface';
import type { ResolvedAiConnection } from './interfaces/resolved-ai-connection.interface';
import type { AiModelSlot } from './types/ai-model-slot.type';
import { resolveAiModel } from './resolve-ai-model.util';

export function resolveAiConnection(
  config: AiConnectionConfig,
  slot: AiModelSlot
): ResolvedAiConnection {
  const resolved =
    slot === 'intelligent'
      ? {
          provider: normalizeAiProvider(
            config.AiIntelligentProvider ?? config.AiProvider ?? 'openrouter'
          ),
          endpoint: (config.AiIntelligentEndpoint ?? config.AiEndpoint ?? '').trim(),
          apiKey: (config.AiIntelligentApiKey ?? config.AiApiKey ?? '').trim(),
          model: resolveAiModel(config, 'intelligent'),
        }
      : {
          provider: normalizeAiProvider(
            config.AiFastProvider ?? config.AiProvider ?? 'openrouter'
          ),
          endpoint: (config.AiFastEndpoint ?? config.AiEndpoint ?? '').trim(),
          apiKey: (config.AiFastApiKey ?? config.AiApiKey ?? '').trim(),
          model: resolveAiModel(config, 'fast'),
        };

  if (resolved.provider === 'openrouter' && !resolved.apiKey) {
    const runtime = getEnv();
    resolved.apiKey = (runtime.OPENROUTER_API_KEY || runtime.GEMINI_API_KEY || '').trim();
  }

  return resolved;
}

export function isAiSlotConfigured(connection: ResolvedAiConnection): boolean {
  if (connection.provider === 'local') {
    return !!connection.endpoint;
  }
  const runtime = getEnv();
  return !!connection.apiKey || !!runtime.OPENROUTER_API_KEY || !!runtime.GEMINI_API_KEY;
}
