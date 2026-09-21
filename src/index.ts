import { Elysia, StatusMap, t, type AnyElysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { env } from './common/consts/runtime-config';
import { getPublicAppUrl } from './common/utils/public-app-url.util';
import { handleError } from './common/middlewares/error.middleware';
import { createAppContainer } from './app.container';
import { runMigrations } from './common/database/migrations';
import { initializeSchema } from './common/database/init-schema';
import { verifyToken } from '@/common/utils/token';
import { getListAccessContext } from '@/common/middlewares/list-access.middleware';
import { pascalizeKeys } from '@/common/utils/api-case.util';
import {
  addWishlistWsConnection,
  getOnlineUsers,
  removeWishlistWsConnection,
} from '@/modules/wishlist/infrastructure/wishlist-ws-registry';
import {
  addUserWsConnection,
  removeUserWsConnection,
} from '@/modules/notifications/infrastructure/user-ws-registry';
import {
  resolveProcessRole,
  shouldListenRealtimeFanout,
  shouldRunJobs,
  shouldServeHttp,
} from '@/common/utils/process-role.util';
import {
  wireDirectRealtimePublishers,
} from '@/boot/runtime-publishers';
import { startPostgresRealtimeListener } from '@/modules/jobs/infrastructure/postgres-realtime-listener';

function getNumericStatus(status: any, defaultStatus = 200): number {
  if (typeof status === 'number') return status;
  if (typeof status === 'string') {
    const code = (StatusMap as any)[status];
    if (code !== undefined) return code;
    const parsed = parseInt(status, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultStatus;
}

function cleanHeaders(headers: any): Record<string, string> {
  const result: Record<string, string> = { 'Content-Type': 'application/json' };
  if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers)) {
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
  }
  return result;
}

const processRole = resolveProcessRole();
if (processRole === 'worker') {
  console.error(
    '[boot] GIFTISTRY_PROCESS_ROLE=worker is not valid for src/index.ts. Use: bun run src/worker.ts'
  );
  process.exit(1);
}

const container = createAppContainer({
  skipItemJobCompletionNotify: false,
});
const {
  authModule,
  wishlistModule,
  itemModule,
  jobsModule,
  jobRunner,
  jobRepo,
  notifyItemJobCompletion,
  commentModule,
  friendsModule,
  notificationsModule,
  invitesModule,
  registrationInviteModule,
  systemModule,
  adminModule,
  userRepo: userRepoForWs,
  realtimePublishers,
} = container;

function publishPresence(listId: string, ws?: { publish: (topic: string, data: string) => void; send?: (data: string) => void }) {
  const users = getOnlineUsers(listId);
  const payload = JSON.stringify({ Type: 'presence', Users: users });

  if (ws?.publish) {
    ws.publish(listId, payload);
  }
  if (ws?.send) {
    ws.send(payload);
  }
}

function resolveCorsOrigin(request: Request): boolean {
  if (!env.isProduction) {
    return true;
  }

  const publicUrl = getPublicAppUrl();
  if (!publicUrl) {
    return false;
  }

  const origin = request.headers.get('origin');
  if (!origin) {
    return true;
  }

  try {
    const allowedOrigin = new URL(publicUrl).origin;
    if (origin === allowedOrigin) {
      return true;
    }
    return new URL(origin).hostname === new URL(publicUrl).hostname;
  } catch {
    return false;
  }
}

let app: AnyElysia = new Elysia()
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
  .mapResponse(({ responseValue, set, correlationId, request }) => {
    const url = new URL(request.url);
    const numericStatus = getNumericStatus(set.status, 200);
    console.log(`[INFO] [CorrelationId: ${correlationId}] ${request.method} ${url.pathname} - Status: ${numericStatus}`);

    if (responseValue === undefined || responseValue === null) {
      const code = getNumericStatus(set.status, 204);
      return new Response(JSON.stringify({
        Meta: {
          Status: 'Success',
          Code: code,
          CorrelationId: correlationId
        },
        Result: {}
      }), {
        status: code,
        headers: cleanHeaders(set.headers)
      });
    }

    if (responseValue instanceof Response) {
      return responseValue;
    }

    const isError = responseValue && typeof responseValue === 'object' &&
      (('status' in responseValue && responseValue.status === 'error') ||
        ('Status' in responseValue && responseValue.Status === 'error'));
    const status = isError ? 'Error' : 'Success';
    const code = numericStatus;
    let payload = responseValue;

    if (isError) {
      // If error payload is returned by handleRoute or middleware, convert its message property to Message
      const { Status, status, Code, code, Message, message, ...rest } = responseValue as any;
      payload = {
        Message: Message ?? message,
        ...rest
      };
    } else if (responseValue && typeof responseValue === 'object') {
      const { success, data, ...rest } = responseValue as any;
      if (data !== undefined) {
        payload = data;
      } else {
        payload = rest;
      }
    }

    return new Response(JSON.stringify({
      Meta: {
        Status: status,
        Code: code,
        CorrelationId: correlationId
      },
      Result: isError ? payload : pascalizeKeys(payload)
    }), {
      status: numericStatus,
      headers: cleanHeaders(set.headers)
    });
  });

app = app
  .use(authModule as AnyElysia)
  .use(notificationsModule as AnyElysia)
  .use(wishlistModule as AnyElysia)
  .use(itemModule as AnyElysia)
  .use(jobsModule as AnyElysia)
  .use(commentModule as AnyElysia)
  .use(friendsModule as AnyElysia)
  .use(invitesModule as AnyElysia)
  .use(registrationInviteModule as AnyElysia)
  .use(systemModule as AnyElysia)
  .use(adminModule as AnyElysia);

app = (app as any)
  .ws('/ws/wishlist/:listId', {
    query: t.Object({
      token: t.String()
    }),
    async open(ws: any) {
      const { listId } = ws.data.params;
      const { token } = ws.data.query;
      
      const payload = await verifyToken(token);
      if (!payload) {
        ws.close();
        return;
      }
      
      const user = await userRepoForWs.findById(payload.userId);
      if (!user) {
        ws.close();
        return;
      }
      
      try {
        await getListAccessContext(user.Id, { listId });
      } catch (err) {
        ws.close();
        return;
      }
      
      const wsId = crypto.randomUUID();
      ws.data.wsId = wsId;
      ws.data.user = user;
      
      ws.subscribe(listId);

      addWishlistWsConnection(listId, wsId, {
        username: user.Username,
        userId: user.Id,
        send: (data: string) => ws.send(data),
      });

      publishPresence(listId, ws);
    },
    message(ws: any, message: any) {
      const { listId } = ws.data.params;
      try {
        const data = typeof message === 'string' ? JSON.parse(message) : message;
        if (data && data.Type === 'typing') {
          const user = ws.data.user;
          if (user) {
            ws.publish(listId, JSON.stringify({
              Type: 'typing',
              UserId: user.Id,
              Username: user.Username,
              IsTyping: !!data.IsTyping,
            }));
          }
        }
      } catch (err) {
        console.error('Error handling ws message:', err);
      }
    },
    close(ws: any) {
      const { listId } = ws.data.params;
      const wsId = ws.data.wsId;
      if (wsId && removeWishlistWsConnection(listId, wsId)) {
        publishPresence(listId, ws);
      }
    }
  })
  .ws('/ws/user', {
    query: t.Object({
      token: t.String()
    }),
    async open(ws: any) {
      const { token } = ws.data.query;
      const payload = await verifyToken(token);
      if (!payload) {
        ws.close();
        return;
      }
      
      const user = await userRepoForWs.findById(payload.userId);
      if (!user) {
        ws.close();
        return;
      }
      
      const wsId = crypto.randomUUID();
      ws.data.wsId = wsId;
      ws.data.user = user;
      
      ws.subscribe(user.Id);
      addUserWsConnection(user.Id, wsId);
    },
    close(ws: any) {
      const user = ws.data.user;
      const wsId = ws.data.wsId;
      if (user?.Id && wsId) {
        removeUserWsConnection(user.Id, wsId);
      }
    }
  })
  .get('/health', () => ({ Status: 'ok', Database: 'connected', Version: '0.1.0' })) as AnyElysia;

export { app };

await initializeSchema()
  .then(() => runMigrations())
  .catch((err) => {
  console.error('[ERROR] Migration failed:', err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

if (process.env.NODE_ENV !== 'test') {
  if (!shouldServeHttp(processRole)) {
    console.error(`[boot] Role "${processRole}" cannot serve HTTP via index.ts`);
    process.exit(1);
  }

  if (env.isProduction && !getPublicAppUrl()) {
    console.error(
      '[boot] GIFTISTRY_PUBLIC_APP_URL (or config PublicAppUrl) is required in production. Set it for CORS, email links, and WebAuthn.'
    );
    process.exit(1);
  }

  app.listen(env.PORT);
  wireDirectRealtimePublishers((room, data) => {
    app.server?.publish(room, data);
  }, realtimePublishers);

  if (shouldListenRealtimeFanout(processRole)) {
    void startPostgresRealtimeListener({
      jobRepo,
      publishToWs: (room, payloadJson) => {
        app.server?.publish(room, payloadJson);
      },
      notifyItemJobCompletion,
    }).catch((err) => {
      console.error('[boot] Failed to start realtime fanout listener:', err);
    });
  }

  if (shouldRunJobs(processRole)) {
    jobRunner.start();
  } else {
    console.log(
      `[boot] Job runner disabled (GIFTISTRY_PROCESS_ROLE=${processRole}); use the worker process for jobs`
    );
  }

  console.log(
    `Giftistry API is running at http://${app.server?.hostname}:${app.server?.port} (role=${processRole})`
  );
}
