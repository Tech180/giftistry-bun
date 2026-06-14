import { Elysia, StatusMap } from 'elysia';
import { cors } from '@elysiajs/cors';
import { env } from './common/consts/env.consts';
import { handleError } from './common/middlewares/error.middleware';
import { authModule } from './modules/auth/auth.module';
import { wishlistModule } from './modules/wishlist/wishlist.module';
import { itemModule } from './modules/item/item.module';
import { commentModule } from './modules/comment/comment.module';

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

export const app = new Elysia()
  .use(cors({
    credentials: true,
    origin: () => true
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
  .get('/health', () => ({ Status: 'ok', Database: 'connected', Version: '0.1.0' }));

if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT);
  console.log(`Giftistry API is running at http://${app.server?.hostname}:${app.server?.port}`);
}
