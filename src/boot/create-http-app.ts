import { Elysia, type AnyElysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { handleError } from '@/common/middlewares/error.middleware';
import type { CreateHttpAppDeps } from '@/boot/interfaces/create-http-app-deps.interface';
import { buildApiEnvelopeResponse } from '@/boot/utils/build-api-envelope-response.util';
import { resolveCorsOrigin } from '@/boot/utils/resolve-cors-origin.util';
import { createInviteWsPlugin } from '@/boot/websocket/invite-ws.plugin';
import { createWishlistWsPlugin } from '@/boot/websocket/wishlist-ws.plugin';
import { createUserWsPlugin } from '@/boot/websocket/user-ws.plugin';

export function createHttpApp(deps: CreateHttpAppDeps): AnyElysia {
  const {
    authModule,
    notificationsModule,
    wishlistModule,
    itemModule,
    jobsModule,
    commentModule,
    friendsModule,
    invitesModule,
    registrationInviteModule,
    systemModule,
    adminModule,
    userRepo,
    linkTokenRepo,
  } = deps;

  return new Elysia()
    .use(cors({
      credentials: true,
      origin: resolveCorsOrigin,
    }))
    .use(swagger({
      path: '/docs',
      documentation: {
        info: {
          title: 'Giftistry API Documentation',
          version: '0.0.1',
          description: 'Interactive OpenAPI specification for the Giftistry application'
        },
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        }
      }
    }))
    .derive({ as: 'global' }, () => ({
      correlationId: crypto.randomUUID()
    }))
    .onError(handleError)
    .mapResponse(({ responseValue, set, correlationId, request }) =>
      buildApiEnvelopeResponse({ responseValue, set, correlationId, request })
    )
    .use(authModule)
    .use(notificationsModule)
    .use(wishlistModule)
    .use(itemModule)
    .use(jobsModule)
    .use(commentModule)
    .use(friendsModule)
    .use(invitesModule)
    .use(registrationInviteModule)
    .use(systemModule)
    .use(adminModule)
    .use(createWishlistWsPlugin(userRepo))
    .use(createUserWsPlugin(userRepo))
    .use(createInviteWsPlugin(linkTokenRepo))
    .get('/health', () => ({ Status: 'ok', Database: 'connected', Version: '0.1.0' }));
}
