import { AppError } from '@/common/middlewares/error.middleware';
import type { AiProvider } from '../domain/server-config.entity';
import {
  buildLocalAiUrl,
  getLocalAiRootUrl,
  normalizeLocalAiEndpoint,
} from '../domain/normalize-local-ai-endpoint';
import { fetchLocalModelIds } from './list-system-models.use-case';

export interface TestAiConnectionInput {
  AiProvider: AiProvider | string;
  AiEndpoint?: string | null;
  AiApiKey?: string | null;
  AiModel?: string | null;
}

export interface TestAiConnectionResult {
  Reachable: boolean;
  ModelAvailable: boolean | null;
  Working: boolean;
  Message: string;
  Models?: string[];
}

const OLLAMA_SHOW_TIMEOUT_MS = 10_000;
const COMPLETION_TIMEOUT_MS = 120_000;

function modelMatchesList(modelName: string, listedId: string): boolean {
  return (
    listedId === modelName ||
    listedId.endsWith(`/${modelName}`) ||
    listedId.split(':')[0] === modelName
  );
}

async function verifyOllamaModelMetadata(
  baseEndpoint: string,
  targetModel: string,
  headers: Record<string, string>
): Promise<boolean> {
  const rootUrl = getLocalAiRootUrl(baseEndpoint);
  const response = await fetch(`${rootUrl}/api/show`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ name: targetModel }),
    signal: AbortSignal.timeout(OLLAMA_SHOW_TIMEOUT_MS),
  });

  return response.ok;
}

async function verifyOpenAiCompatibleCompletion(
  baseEndpoint: string,
  targetModel: string,
  headers: Record<string, string>
): Promise<void> {
  const chatResponse = await fetch(buildLocalAiUrl(baseEndpoint, 'chat/completions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [{ role: 'user', content: 'Reply with OK.' }],
      max_tokens: 16,
    }),
    signal: AbortSignal.timeout(COMPLETION_TIMEOUT_MS),
  });

  if (!chatResponse.ok) {
    const errorText = await chatResponse.text();
    throw new AppError(
      `Local AI server failed completion test (HTTP ${chatResponse.status}): ${errorText}`,
      400,
      'BAD_REQUEST'
    );
  }
}

export class TestAiConnectionUseCase {
  async execute(input: TestAiConnectionInput): Promise<TestAiConnectionResult> {
    if (input.AiProvider !== 'local') {
      throw new AppError('AI connection test is only supported for local providers', 400, 'BAD_REQUEST');
    }

    const baseEndpoint = normalizeLocalAiEndpoint(input.AiEndpoint);
    if (!baseEndpoint) {
      throw new AppError('API endpoint URL is required for local AI provider', 400, 'BAD_REQUEST');
    }

    const headers: Record<string, string> = {};
    if (input.AiApiKey?.trim()) {
      headers.Authorization = `Bearer ${input.AiApiKey.trim()}`;
    }

    const models = await fetchLocalModelIds(input.AiEndpoint, input.AiApiKey);

    const modelName = input.AiModel?.trim() || '';
    let modelAvailable: boolean | null = null;

    if (modelName) {
      modelAvailable = models.some((id) => modelMatchesList(modelName, id));
      if (!modelAvailable) {
        throw new AppError(
          `Model "${modelName}" was not found on the local AI server`,
          400,
          'BAD_REQUEST'
        );
      }
    }

    const targetModel = modelName || models[0];
    if (!targetModel) {
      throw new AppError('Local AI server returned no models', 400, 'BAD_REQUEST');
    }

    let verifiedViaOllamaMetadata = false;

    try {
      verifiedViaOllamaMetadata = await verifyOllamaModelMetadata(baseEndpoint, targetModel, headers);
    } catch {
      verifiedViaOllamaMetadata = false;
    }

    if (!verifiedViaOllamaMetadata) {
      try {
        await verifyOpenAiCompatibleCompletion(baseEndpoint, targetModel, headers);
      } catch (err) {
        if (err instanceof AppError) {
          throw err;
        }
        const message = err instanceof Error ? err.message : 'Unknown completion error';
        throw new AppError(
          `Local AI server is reachable but the model did not respond in time: ${message}. Large models can take a few minutes to load on first use—wait for the model to finish loading and try again.`,
          400,
          'BAD_REQUEST'
        );
      }
    }

    const message = modelName
      ? verifiedViaOllamaMetadata
        ? `Connected — model "${modelName}" is available on the server`
        : `Connected — model "${modelName}" is available and responding`
      : verifiedViaOllamaMetadata
        ? `Connected — default model "${targetModel}" is available on the server`
        : `Connected — default model "${targetModel}" is responding`;

    return {
      Reachable: true,
      ModelAvailable: modelAvailable,
      Working: true,
      Message: message,
      Models: models,
    };
  }
}
