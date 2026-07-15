import { Elysia, StatusMap, t } from 'elysia';
import path from 'path';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { env } from './common/consts/env.consts';
import { handleError } from './common/middlewares/error.middleware';
import { createAppContainer } from './app.container';
import { runMigrations } from './common/database/migrations';
import { sql } from './common/database/connection';
import { verifyToken } from '@/common/utils/token';
import { getListAccessContext } from '@/common/middlewares/list-access.middleware';
import { pascalizeKeys } from '@/common/utils/api-case.util';
import { setWishlistJobPublisher } from '@/modules/jobs/infrastructure/wishlist-job-publisher';

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

function createCachedCssResponse(content: string, request: Request): Response {
  const etag = `W/"${Bun.hash(content).toString(36)}"`;
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  const isProd = process.env.NODE_ENV === 'production';
  return new Response(content, {
    headers: {
      'Content-Type': 'text/css',
      'Cache-Control': isProd ? 'public, max-age=31536000, immutable' : 'public, max-age=60',
      'ETag': etag,
    },
  });
}

const container = createAppContainer();
const {
  authModule,
  wishlistModule,
  itemModule,
  jobsModule,
  jobRunner,
  commentModule,
  friendsModule,
  notificationsModule,
  invitesModule,
  systemModule,
  adminModule,
  authMiddleware,
  userRepo: userRepoForWs,
} = container;
const rooms = new Map<string, Map<string, { username: string; userId: string }>>();

function getOnlineUsers(listId: string): { UserId: string; Username: string }[] {
  const room = rooms.get(listId);
  if (!room) return [];

  const uniqueUsers = new Map<string, string>();
  for (const entry of room.values()) {
    if (!uniqueUsers.has(entry.userId)) {
      uniqueUsers.set(entry.userId, entry.username);
    }
  }

  return Array.from(uniqueUsers.entries()).map(([userId, username]) => ({
    UserId: userId,
    Username: username,
  }));
}

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

export const app = new Elysia()
  .use(cors({
    credentials: true,
    origin: () => true
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
  })
  .use(authModule)
  .use(notificationsModule)
  .use(wishlistModule)
  .use(itemModule)
  .use(jobsModule)
  .use(commentModule)
  .use(friendsModule)
  .use(invitesModule)
  .use(systemModule)
  .use(adminModule)
  .ws('/ws/wishlist/:listId', {
    query: t.Object({
      token: t.String()
    }),
    async open(ws) {
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
      (ws.data as any).wsId = wsId;
      (ws.data as any).user = user;
      
      ws.subscribe(listId);
      
      if (!rooms.has(listId)) {
        rooms.set(listId, new Map());
      }
      
      const name = user.Username;
      rooms.get(listId)!.set(wsId, { username: name, userId: user.Id });

      publishPresence(listId, ws);
    },
    message(ws, message: any) {
      const { listId } = ws.data.params;
      try {
        const data = typeof message === 'string' ? JSON.parse(message) : message;
        if (data && data.Type === 'typing') {
          const user = (ws.data as any).user;
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
    close(ws) {
      const { listId } = ws.data.params;
      const wsId = (ws.data as any).wsId;
      if (rooms.has(listId)) {
        const currentRoom = rooms.get(listId)!;
        currentRoom.delete(wsId);
        if (currentRoom.size === 0) {
          rooms.delete(listId);
        } else {
          publishPresence(listId, ws);
        }
      }
    }
  })
  .get('/api/themes/core/css', async ({ set, request }) => {
    try {
      const filePath = path.join(import.meta.dir, '../../theming-engine/dist/css/variables.css');
      const file = Bun.file(filePath);
      if (await file.exists()) {
        const content = await file.text();
        return createCachedCssResponse(content, request);
      } else {
        console.warn(`[WARNING] Core variables.css file not found at: ${filePath}`);
        set.status = 404;
        return { status: 'error', message: 'Core variables stylesheet not found.' };
      }
    } catch (err: any) {
      set.status = 500;
      return { status: 'error', message: `Failed to load core variables: ${err.message}` };
    }
  })
  .get('/api/themes/:theme/:appearance/css', async ({ params, set, request }) => {
    const { theme, appearance } = params;
    if (appearance !== 'light' && appearance !== 'dark') {
      set.status = 400;
      return { status: 'error', message: 'Invalid appearance. Must be light or dark.' };
    }

    const builtInThemes = [
      'default', 'cyberpunk', 'neon', 'mystic', 'burnt-forest',
      'halloween', 'christmas',
      'valentines', 'st-patricks', 'earth-day', 'independence', 'thanksgiving',
      'paper', 'paper-mario', 'retro-80s', 'pixel', 'matrix', 'terminal', 'vaporwave', 'arcade',
    ];
    if (builtInThemes.includes(theme)) {
      try {
        const filePath = path.join(import.meta.dir, '../../theming-engine/dist/css/themes', `${theme}-${appearance}.css`);
        const file = Bun.file(filePath);
        if (await file.exists()) {
          const content = await file.text();
          return createCachedCssResponse(content, request);
        } else {
          console.warn(`[WARNING] Built-in theme file not found: ${filePath}. Please make sure to run the build command inside the theming-engine directory.`);
        }
      } catch (err: any) {
        console.error('Failed to read theme file:', err);
      }
    }

    // Dynamic Compilation Fallback (Simulates database retrieval of user-generated theme tokens)
    try {
      const [customTheme] = await sql<any[]>`
        SELECT name, colors, advanced FROM user_custom_themes WHERE id = ${theme}
      `;

      let dbTokens = {
        primary: '#ff00ff',
        primaryHover: '#cc00cc',
        accent: '#00ffff',
        bg: '#121212',
        surface: '#1e1e1e',
        surfaceHover: '#2d2d2d',
        surfaceGlass: 'rgba(30, 30, 30, 0.5)',
        border: '#333333',
        text: '#ffffff',
        textMuted: '#aaaaaa',
        radius: '12px',
        shadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        bgGradient: 'linear-gradient(135deg, #121212 0%, #1e1e1e 100%)',
      };

      if (customTheme) {
        let colors = customTheme.colors;
        if (typeof colors === 'string') {
          try {
            colors = JSON.parse(colors);
          } catch (e) {}
        }
        let advanced = customTheme.advanced;
        if (typeof advanced === 'string') {
          try {
            advanced = JSON.parse(advanced);
          } catch (e) {}
        }
        if (!advanced || typeof advanced !== 'object') {
          advanced = {};
        }
        
        dbTokens = {
          primary: colors.primary || dbTokens.primary,
          primaryHover: colors.primaryHover || `${colors.primary || dbTokens.primary}dd`,
          accent: colors.primary || dbTokens.accent,
          bg: colors.bg || dbTokens.bg,
          surface: colors.surface || dbTokens.surface,
          surfaceHover: colors.surfaceHover || `${colors.surface || dbTokens.surface}f0`,
          surfaceGlass: `rgba(30, 30, 30, 0.5)`,
          border: colors.border || dbTokens.border,
          text: colors.text || dbTokens.text,
          textMuted: colors['text-muted'] || colors.textMuted || colors.text || dbTokens.textMuted,
          radius: advanced.radius?.default || dbTokens.radius,
          shadow: advanced.shadows?.md || dbTokens.shadow,
          bgGradient: `linear-gradient(135deg, ${colors.bg || dbTokens.bg} 0%, ${colors.surface || dbTokens.surface} 100%)`,
        };
      }

      const { compileDynamicThemeCss } = await import('../../theming-engine/src/dynamic-compiler');
      const cssContent = await compileDynamicThemeCss(theme, appearance as 'light' | 'dark', dbTokens);

      return createCachedCssResponse(cssContent, request);
    } catch (err: any) {
      set.status = 500;
      return { status: 'error', message: `Failed to compile theme: ${err.message}` };
    }
  })
  .get('/health', () => ({ Status: 'ok', Database: 'connected', Version: '0.1.0' }))
  .use(authMiddleware)
  .post('/api/reports', async ({ getAuthUser, body: { Giftistry: { Report } } }) => {
    const user = await getAuthUser();
    await sql`
      INSERT INTO content_reports (reporter_id, target_type, target_id, reason)
      VALUES (${user.Id}, ${Report.TargetType}, ${Report.TargetId}, ${Report.Reason ?? ''})
    `;
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Report: t.Object({
          TargetType: t.Union([t.Literal('comment'), t.Literal('wishlist'), t.Literal('user')]),
          TargetId: t.String(),
          Reason: t.Optional(t.String()),
        }),
      }),
    }),
  });

await runMigrations().catch((err) => {
  console.error('[ERROR] Migration failed:', err);
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT);
  setWishlistJobPublisher((listId, payload) => {
    app.server?.publish(listId, JSON.stringify(payload));
  });
  jobRunner.start();
  console.log(`Giftistry API is running at http://${app.server?.hostname}:${app.server?.port}`);
}
