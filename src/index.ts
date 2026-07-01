import { Elysia, StatusMap, t } from 'elysia';
import path from 'path';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { env } from './common/consts/env.consts';
import { handleError } from './common/middlewares/error.middleware';
import { authModule } from './modules/auth/auth.module';
import { wishlistModule } from './modules/wishlist/wishlist.module';
import { itemModule } from './modules/item/item.module';
import { commentModule } from './modules/comment/comment.module';
import { systemRoutes } from './modules/system/system.routes';
import { sql } from './common/database/connection';
import { verifyToken } from '@/common/utils/token';
import { PostgresUserRepository } from '@/modules/auth/infrastructure/postgres-user.repository';
import { getListAccessContext } from '@/common/middlewares/list-access.middleware';

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

const userRepoForWs = new PostgresUserRepository();
const rooms = new Map<string, Map<string, { username: string; userId: string }>>();

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
        Message: Message || message,
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
      Result: payload
    }), {
      status: numericStatus,
      headers: cleanHeaders(set.headers)
    });
  })
  .use(authModule)
  .use(wishlistModule)
  .use(itemModule)
  .use(commentModule)
  .use(systemRoutes)
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
      
      const name = user.FirstName ? `${user.FirstName} ${user.LastName}` : user.Username;
      rooms.get(listId)!.set(wsId, { username: name, userId: user.Id });
      
      const onlineUsers = Array.from(rooms.get(listId)!.values()).map(u => u.username);
      
      // Broadcast presence updates
      ws.publish(listId, JSON.stringify({
        type: 'presence',
        users: onlineUsers
      }));
      
      ws.send(JSON.stringify({
        type: 'presence',
        users: onlineUsers
      }));
    },
    message(ws, message: any) {
      const { listId } = ws.data.params;
      try {
        const data = typeof message === 'string' ? JSON.parse(message) : message;
        if (data && data.type === 'typing') {
          const user = (ws.data as any).user;
          if (user) {
            const name = user.FirstName ? `${user.FirstName} ${user.LastName}` : user.Username;
            ws.publish(listId, JSON.stringify({
              type: 'typing',
              userId: user.Id,
              username: name,
              isTyping: !!data.isTyping
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
          const onlineUsers = Array.from(currentRoom.values()).map(u => u.username);
          ws.publish(listId, JSON.stringify({
            type: 'presence',
            users: onlineUsers
          }));
        }
      }
    }
  })
  .get('/api/themes/core/css', async ({ set }) => {
    try {
      const filePath = path.join(import.meta.dir, '../../theming-engine/dist/css/variables.css');
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return new Response(await file.text(), {
          headers: { 'Content-Type': 'text/css' }
        });
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
  .get('/api/themes/:theme/:appearance/css', async ({ params, set }) => {
    const { theme, appearance } = params;
    if (appearance !== 'light' && appearance !== 'dark') {
      set.status = 400;
      return { status: 'error', message: 'Invalid appearance. Must be light or dark.' };
    }

    const builtInThemes = ['default', 'cyberpunk', 'neon', 'mystic', 'burnt-forest', 'halloween', 'christmas'];
    if (builtInThemes.includes(theme)) {
      try {
        const filePath = path.join(import.meta.dir, '../../theming-engine/dist/css/themes', `${theme}-${appearance}.css`);
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(await file.text(), {
            headers: { 'Content-Type': 'text/css' }
          });
        } else {
          console.warn(`[WARNING] Built-in theme file not found: ${filePath}. Please make sure to run the build command inside the theming-engine directory.`);
        }
      } catch (err: any) {
        console.error('Failed to read theme file:', err);
      }
    }

    // Dynamic Compilation Fallback (Simulates database retrieval of user-generated theme tokens)
    try {
      const dbTokens = {
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

      const { compileDynamicThemeCss } = await import('../../theming-engine/src/dynamic-compiler');
      const cssContent = await compileDynamicThemeCss(theme, appearance as 'light' | 'dark', dbTokens);

      return new Response(cssContent, {
        headers: { 'Content-Type': 'text/css' }
      });
    } catch (err: any) {
      set.status = 500;
      return { status: 'error', message: `Failed to compile theme: ${err.message}` };
    }
  })
  .get('/health', () => ({ Status: 'ok', Database: 'connected', Version: '0.1.0' }));

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT);
  console.log(`Giftistry API is running at http://${app.server?.hostname}:${app.server?.port}`);
}
