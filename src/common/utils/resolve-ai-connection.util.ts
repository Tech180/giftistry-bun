import type { AiProvider } from '@/modules/system/domain/server-config.entity';
import { normalizeAiProvider } from '@/modules/system/domain/server-config.entity';
import { env } from '@/common/consts/env.consts';
import { resolveAiModel, type AiModelSlot } from './resolve-ai-model.util';

export type { AiModelSlot };

export interface AiConnectionConfig {
  AiFastProvider?: string;
  AiFastEndpoint?: string;
  AiFastApiKey?: string;
  AiFastModel?: string;
  AiIntelligentProvider?: string;
  AiIntelligentEndpoint?: string;
  AiIntelligentApiKey?: string;
  AiIntelligentModel?: string;
  /** @deprecated migration only — prefer slot fields */
  AiProvider?: string;
  AiEndpoint?: string;
  AiApiKey?: string;
  AiModel?: string;
}

export interface ResolvedAiConnection {
  provider: AiProvider;
  endpoint: string;
  apiKey: string;
  model: string;
}

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
    resolved.apiKey = (env.OPENROUTER_API_KEY || env.GEMINI_API_KEY || '').trim();
  }

  return resolved;
}

export function isAiSlotConfigured(connection: ResolvedAiConnection): boolean {
  if (connection.provider === 'local') {
    return !!connection.endpoint;
  }
  return !!connection.apiKey || !!env.OPENROUTER_API_KEY || !!env.GEMINI_API_KEY;
}
