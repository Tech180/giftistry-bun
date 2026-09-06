import { loadConfig } from '@/common/infrastructure/config.loader';
import {
  clampAiConnectTimeoutMs,
  DEFAULT_AI_CONNECT_TIMEOUT_MS,
} from '@/modules/system/domain/server-config.entity';

export { DEFAULT_AI_CONNECT_TIMEOUT_MS };

export function resolveAiConnectTimeoutMs(override?: number): number {
  if (override !== undefined && Number.isFinite(override) && override > 0) {
    return clampAiConnectTimeoutMs(override);
  }

  try {
    const config = loadConfig();
    if (
      config.AiConnectTimeoutMs !== undefined &&
      Number.isFinite(config.AiConnectTimeoutMs)
    ) {
      return clampAiConnectTimeoutMs(config.AiConnectTimeoutMs);
    }
  } catch {
    /* config may be unavailable during early boot */
  }

  const fromEnv = Number.parseInt(process.env.AI_CONNECT_TIMEOUT_MS || '', 10);
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return clampAiConnectTimeoutMs(fromEnv);
  }

  return DEFAULT_AI_CONNECT_TIMEOUT_MS;
}

export function formatAiTimeoutMessage(timeoutMs: number): string {
  const seconds = Math.max(1, Math.round(timeoutMs / 1000));
  if (seconds >= 60) {
    const minutes = Math.round(seconds / 60);
    return `AI request timed out after ${minutes} minute${minutes === 1 ? '' : 's'}. Try a faster model or a smaller file.`;
  }
  return `AI request timed out after ${seconds} second${seconds === 1 ? '' : 's'}. Try a faster model or a smaller file.`;
}

export function formatAiConnectErrorMessage(timeoutMs: number): string {
  const seconds = Math.max(1, Math.round(timeoutMs / 1000));
  return `Could not connect to the AI server within ${seconds} second${seconds === 1 ? '' : 's'}. Check that the endpoint is reachable and try again.`;
}

export function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const error = err as { name?: string; message?: string; code?: string | number };
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return true;
  if (error.code === 23 || error.code === 'ABORT_ERR') return true;
  const message = error.message || '';
  return /timed out|aborted due to timeout/i.test(message);
}

export function isConnectError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const error = err as {
    name?: string;
    message?: string;
    code?: string | number;
    cause?: { code?: string | number; message?: string };
  };

  const code = String(error.code ?? error.cause?.code ?? '');
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ECONNRESET' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENETUNREACH' ||
    code === 'ETIMEDOUT' ||
    code === 'UND_ERR_CONNECT_TIMEOUT'
  ) {
    return true;
  }

  const message = `${error.message || ''} ${error.cause?.message || ''}`;
  return /could not connect to the ai server|connect(?:ion)? (?:timed? ?out|refused|failed)|failed to (?:connect|fetch)|getaddrinfo|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network is unreachable|host is unreachable/i.test(
    message
  );
}

type BunFetchInit = RequestInit & {
  timeout?: false | number | { connect?: number; idle?: number };
};

export interface AiFetchTimeoutOptions {
  connectTimeoutMs: number;
  completionTimeoutMs: number;
}

export async function fetchWithAiTimeouts(
  url: string,
  init: RequestInit,
  options: AiFetchTimeoutOptions
): Promise<Response> {
  const { connectTimeoutMs, completionTimeoutMs } = options;
  const controller = new AbortController();
  let connectTimedOut = false;

  const onExternalAbort = () => {
    controller.abort(init.signal?.reason);
  };
  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort(init.signal.reason);
    } else {
      init.signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const connectTimer = setTimeout(() => {
    connectTimedOut = true;
    controller.abort();
  }, connectTimeoutMs);

  // Remains linked after headers so mid-stream generation still respects the budget.
  const completionSignal = AbortSignal.timeout(completionTimeoutMs);
  const onCompletionAbort = () => {
    if (!connectTimedOut) {
      controller.abort();
    }
  };
  completionSignal.addEventListener('abort', onCompletionAbort);

  const { signal: _ignored, ...restInit } = init;
  const merged: BunFetchInit = {
    ...restInit,
    signal: controller.signal,
    // Disable Bun's built-in ~5m fetch ceiling so long streams can finish.
    timeout: false,
  };

  try {
    const response = await fetch(url, merged);
    clearTimeout(connectTimer);
    return response;
  } catch (err) {
    clearTimeout(connectTimer);
    completionSignal.removeEventListener('abort', onCompletionAbort);
    if (init.signal) {
      init.signal.removeEventListener('abort', onExternalAbort);
    }
    if (connectTimedOut || isConnectError(err)) {
      throw new Error(formatAiConnectErrorMessage(connectTimeoutMs));
    }
    if (isTimeoutError(err) || completionSignal.aborted) {
      throw new Error(formatAiTimeoutMessage(completionTimeoutMs));
    }
    throw err;
  }
}
