import { Elysia } from 'elysia';
import { ownerAuthMiddleware } from '@/modules/auth';
import { SYSTEM_OWNER_SWAGGER_DETAIL } from '../constants/swagger-detail.constant';
import type { UseCases } from '../interfaces/use-cases.interface';
import { aiCheckBodySchema } from '../schemas/ai-check-body.schema';
import { listModelsQuerySchema } from '../schemas/list-models-query.schema';

export const aiRoutes = (useCases: UseCases) =>
  new Elysia()
    .use(ownerAuthMiddleware)
    .post(
      '/ai-check',
      async ({ getOwnerUser, body: { Giftistry: { System: payload } } }) => {
        await getOwnerUser();
        const slot = payload.AiModelSlot === 'intelligent' ? 'intelligent' : 'fast';
        const model =
          slot === 'intelligent' ? payload.AiIntelligentModel : payload.AiFastModel;

        const result = await useCases.testAiConnection.execute({
          AiProvider: payload.AiProvider || 'local',
          AiEndpoint: payload.AiEndpoint,
          AiApiKey: payload.AiApiKey,
          AiModel: model,
        });

        return { success: true, data: result };
      },
      {
        body: aiCheckBodySchema,
        detail: { ...SYSTEM_OWNER_SWAGGER_DETAIL, summary: 'Test AI connection' },
      }
    )
    .get(
      '/models',
      async ({ getOwnerUser, query }) => {
        await getOwnerUser();
        const data = await useCases.listSystemModels.execute({
          Provider: query.Provider,
          Endpoint: query.Endpoint,
          ApiKey: query.ApiKey,
        });
        return { success: true, data };
      },
      {
        query: listModelsQuerySchema,
        detail: { ...SYSTEM_OWNER_SWAGGER_DETAIL, summary: 'List AI models' },
      }
    );
