import { loadConfig } from '@/common/config/utils/server-config-file.util';
import {
  clampAiCompletionTimeoutMs,
  DEFAULT_AI_COMPLETION_TIMEOUT_MS,
} from '@/modules/system';

export function resolveCompletionTimeoutMs(override?: number): number {
  if (override !== undefined && Number.isFinite(override) && override > 0) {
    return clampAiCompletionTimeoutMs(override);
  }

  try {
    const config = loadConfig();
    if (
      config.AiCompletionTimeoutMs !== undefined &&
      Number.isFinite(config.AiCompletionTimeoutMs)
    ) {
      return clampAiCompletionTimeoutMs(config.AiCompletionTimeoutMs);
    }
  } catch {
    /* config may be unavailable during early boot */
  }

  const fromEnv = Number.parseInt(process.env.AI_COMPLETION_TIMEOUT_MS || '', 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return clampAiCompletionTimeoutMs(fromEnv);
  }

  return DEFAULT_AI_COMPLETION_TIMEOUT_MS;
}
