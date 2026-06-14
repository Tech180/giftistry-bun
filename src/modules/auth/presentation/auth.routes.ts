import { Elysia, t } from 'elysia';
import { createToken, verifyToken } from '@/common/utils/token';
import { AppError } from '@/common/middlewares/error.middleware';
import type { AuthUseCases } from './auth-use-cases.interface';
import { PostgresUserRepository } from '../infrastructure/postgres-user.repository';
import { rateLimit } from '@/common/middlewares/rate-limit.middleware';

const userRepo = new PostgresUserRepository();

export const authMiddleware = new Elysia()
  .derive({ as: 'global' }, async ({ headers }) => {
    return {
      getAuthUser: async () => {
        let token: string | null = null;
        
        // 1. Check Authorization header
        const authHeader = headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        } else {
          // 2. Check Cookie
          const cookieHeader = headers['cookie'] || '';
          const match = cookieHeader.match(/(?:^|; )jwt=([^;]*)/);
          if (match) {
            token = match[1] || null;
          }
        }

        if (!token) {
          throw new AppError('Unauthorized: Missing token', 401, 'UNAUTHORIZED');
        }

        const payload = await verifyToken(token);
        if (!payload) {
          throw new AppError('Unauthorized: Invalid or expired token', 401, 'UNAUTHORIZED');
        }

        // 3. Verify user exists in the database
        const user = await userRepo.findById(payload.userId);
        if (!user) {
          throw new AppError('Unauthorized: User not found', 401, 'UNAUTHORIZED');
        }

        return {
          userId: user.Id,
          email: user.Email,
          Id: user.Id,
          Username: user.Username,
          Email: user.Email,
          FirstName: user.FirstName,
          LastName: user.LastName,
          CreatedAt: user.CreatedAt,
        };
      },
      getOptionalAuthUser: async () => {
        let token: string | null = null;
        
        const authHeader = headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        } else {
          const cookieHeader = headers['cookie'] || '';
          const match = cookieHeader.match(/(?:^|; )jwt=([^;]*)/);
          if (match) {
            token = match[1] || null;
          }
        }

        if (!token) return null;
        const payload = await verifyToken(token);
        if (!payload) return null;

        const user = await userRepo.findById(payload.userId);
        if (!user) return null;

        return {
          userId: user.Id,
          email: user.Email,
          Id: user.Id,
          Username: user.Username,
          Email: user.Email,
          FirstName: user.FirstName,
          LastName: user.LastName,
          CreatedAt: user.CreatedAt,
        };
      }
    };
  });

export const authRoutes = (useCases: AuthUseCases) => new Elysia({ prefix: '/api/auth' })
  .use(rateLimit({ windowMs: 60000, max: 5 }))
  .post('/signup', async ({ set, body: { Giftistry: { username, email, password, firstName, lastName } } }) => {
    const user = await useCases.signup.execute(username, email, password, firstName ?? undefined, lastName ?? undefined);
    const token = await createToken({ userId: user.Id });
    
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? 'Secure; ' : '';
    set.headers['Set-Cookie'] = `jwt=${token}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=86400`;
    
    return { success: true, User: user, Token: token };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        username: t.String({ minLength: 3, maxLength: 50 }),
        email: t.String({ format: 'email' }),
        firstName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
        lastName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
        password: t.String({ minLength: 6 }),
      })
    })
  })
  .post('/login', async ({ set, body: { Giftistry: { email, password } } }) => {
    const user = await useCases.login.execute(email, password);
    const token = await createToken({ userId: user.Id });
    
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? 'Secure; ' : '';
    set.headers['Set-Cookie'] = `jwt=${token}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=86400`;
    
    return { success: true, User: user, Token: token };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        email: t.String(),
        password: t.String(),
      })
    })
  })
  .use(authMiddleware)
  .get('/me', async ({ getAuthUser }) => {
    const authUser = await getAuthUser();
    return { success: true, User: authUser };
  })
  .post('/logout', async ({ set }) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? 'Secure; ' : '';
    set.headers['Set-Cookie'] = `jwt=; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=0`;
    return { success: true };
  })
  .put('/profile', async ({ getAuthUser, body: { Giftistry: { username, firstName, lastName } } }) => {
    const authUser = await getAuthUser();
    const user = await useCases.updateProfile.execute(authUser.userId, {
      username,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
    });
    
    return { success: true, User: user };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        username: t.Optional(t.String({ minLength: 3, maxLength: 50 })),
        firstName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
        lastName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
      })
    })
  });
