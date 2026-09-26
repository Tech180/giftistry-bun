import { Elysia } from 'elysia';
import type { UseCases } from './interfaces/use-cases.interface';
import { aiRoutes } from './routes/ai.routes';
import { ntfyRoutes } from './routes/ntfy.routes';
import { ownershipRoutes } from './routes/ownership.routes';
import { publicRoutes } from './routes/public.routes';
import { pushPublicRoutes } from './routes/push-public.routes';
import { settingsRoutes } from './routes/settings.routes';

export const systemRoutes = (useCases: UseCases) =>
  new Elysia({ prefix: '/api/system' })
    .use(publicRoutes(useCases))
    .use(settingsRoutes(useCases))
    .use(pushPublicRoutes(useCases))
    .use(ntfyRoutes(useCases))
    .use(aiRoutes(useCases))
    .use(ownershipRoutes(useCases));
