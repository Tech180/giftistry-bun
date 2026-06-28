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
          Bio: user.Bio,
          Theme: user.Theme,
          Avatar: user.Avatar,
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
          Bio: user.Bio,
          Theme: user.Theme,
          Avatar: user.Avatar,
        };
      }
    };
  });

export const authRoutes = (useCases: AuthUseCases) => new Elysia()
  .get('/api/users/:userId/preview', async ({ params: { userId } }) => {
    const preview = await useCases.userPreview.execute(userId);
    if (!preview) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    return { success: true, User: preview };
  }, {
    detail: {
      tags: ['Users'],
      summary: 'Get public user preview profile',
      description: 'Returns public user profile information like display name, username, bio, join date, theme, and avatar.'
    }
  })
  .group('/api/auth', (group) => group
    .use(rateLimit({ windowMs: 60000, max: 5 }))
    .post('/signup', async ({ set, body: { Giftistry: { Auth: { username, email, password, firstName, lastName } } } }) => {
      const user = await useCases.signup.execute(username, email, password, firstName ?? undefined, lastName ?? undefined);
      const token = await createToken({ userId: user.Id });
      
      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? 'Secure; ' : '';
      set.headers['Set-Cookie'] = `jwt=${token}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=86400`;
      
      return { success: true, User: user, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Creates a new user profile and sets the JWT session cookie.'
      },
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            username: t.String({ minLength: 3, maxLength: 50 }),
            email: t.String({ format: 'email' }),
            firstName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
            lastName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
            password: t.String({ minLength: 6 }),
          })
        })
      })
    })
    .post('/login', async ({ set, body: { Giftistry: { Auth: { email, password } } } }) => {
      const user = await useCases.login.execute(email, password);
      const token = await createToken({ userId: user.Id });
      
      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? 'Secure; ' : '';
      set.headers['Set-Cookie'] = `jwt=${token}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=86400`;
      
      return { success: true, User: user, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Authenticate a user',
        description: 'Verifies email/password and sets the HTTP-only JWT session cookie.'
      },
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            email: t.String(),
            password: t.String(),
          })
        })
      })
    })
    .use(authMiddleware)
    .get('/me', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      return { success: true, User: authUser };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Get active user profile',
        description: 'Extracts the JWT from cookie/bearer token and returns the authenticated user context.',
        security: [{ bearerAuth: [] }]
      }
    })
    .post('/logout', async ({ set }) => {
      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? 'Secure; ' : '';
      set.headers['Set-Cookie'] = `jwt=; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=0`;
      return { success: true };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Clears the JWT session cookie.'
      }
    })
    .put('/profile', async ({ getAuthUser, body: { Giftistry: { Auth: { username, firstName, lastName, bio, theme, avatar } } } }) => {
      const authUser = await getAuthUser();

      // Backend avatar validation
      if (avatar) {
        if (avatar.startsWith('data:')) {
          const matches = avatar.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
          if (!matches) {
            throw new AppError('Invalid image data URL format. Only base64 encoded images are allowed.', 400, 'BAD_REQUEST');
          }
          
          const mimeType = matches[1];
          const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
          if (!allowedMimeTypes.includes(mimeType)) {
            throw new AppError('Invalid image type. Only PNG, JPG, and SVG are supported.', 400, 'BAD_REQUEST');
          }
          
          const base64Data = matches[2];
          const sizeInBytes = Math.floor((base64Data.length * 3) / 4);
          const maxSize = 2 * 1024 * 1024; // 2MB limit
          if (sizeInBytes > maxSize) {
            throw new AppError('Image size exceeds the 2MB limit.', 400, 'BAD_REQUEST');
          }
        }
      }

      const user = await useCases.updateProfile.execute(authUser.userId, {
        username,
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        bio: bio ?? undefined,
        theme: theme ?? undefined,
        avatar: avatar ?? undefined,
      });
      
      return { success: true, User: user };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Update user profile details',
        description: 'Updates username, first name, last name, bio, theme, or avatar of the active user profile.',
        security: [{ bearerAuth: [] }]
      },
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            username: t.Optional(t.String({ minLength: 3, maxLength: 50 })),
            firstName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
            lastName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
            bio: t.Optional(t.Nullable(t.String())),
            theme: t.Optional(t.Nullable(t.String())),
            avatar: t.Optional(t.Nullable(t.String())),
          })
        })
      })
    })
  );
