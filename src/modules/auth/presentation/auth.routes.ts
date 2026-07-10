import { Elysia, t } from 'elysia';
import { createToken, verifyToken } from '@/common/utils/token';
import { AppError } from '@/common/middlewares/error.middleware';
import type { AuthUseCases } from './auth-use-cases.interface';
import type { UserRepository } from '../domain/ports/user.repository';
import { rateLimit } from '@/common/middlewares/rate-limit.middleware';
import { isAvatarColor } from '@/common/utils/avatar.util';

const getCookie = (cookieHeader: string | undefined, name: string): string | null => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

function secureCookieFlag(): string {
  return process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
}

function setJwtCookie(set: { headers: Record<string, string | number | undefined> }, token: string): void {
  set.headers['Set-Cookie'] = `jwt=${token}; HttpOnly; ${secureCookieFlag()}SameSite=Strict; Path=/; Max-Age=86400`;
}

function clearJwtCookie(set: { headers: Record<string, string | number | undefined> }): void {
  set.headers['Set-Cookie'] = `jwt=; HttpOnly; ${secureCookieFlag()}SameSite=Strict; Path=/; Max-Age=0`;
}

function setPasskeyChallengeCookie(set: { headers: Record<string, string | number | undefined> }, challenge: string): void {
  set.headers['Set-Cookie'] = `passkey_challenge=${encodeURIComponent(challenge)}; HttpOnly; ${secureCookieFlag()}SameSite=Strict; Path=/; Max-Age=300`;
}

export function createAuthMiddleware(userRepo: UserRepository) {
  return new Elysia()
    .derive({ as: 'global' }, async ({ headers }) => {
      return {
        getAuthUser: async () => {
          let token: string | null = null;

          const authHeader = headers['authorization'];
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          } else {
            token = getCookie(headers['cookie'], 'jwt');
          }

          if (!token) {
            throw new AppError('Unauthorized: Missing token', 401, 'UNAUTHORIZED');
          }

          const payload = await verifyToken(token);
          if (!payload) {
            throw new AppError('Unauthorized: Invalid or expired token', 401, 'UNAUTHORIZED');
          }

          const user = await userRepo.findById(payload.userId);
          if (!user) {
            throw new AppError('Unauthorized: User not found', 401, 'UNAUTHORIZED');
          }

          if (user.IsDisabled) {
            throw new AppError('Your account has been disabled', 403, 'FORBIDDEN');
          }

          if (payload.sessionVersion !== undefined && user.SessionVersion !== undefined && payload.sessionVersion !== user.SessionVersion) {
            throw new AppError('Session expired. Please log in again.', 401, 'UNAUTHORIZED');
          }

          userRepo.updateLastOnline(user.Id).catch(console.error);

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
            EmailVerified: user.EmailVerified,
            TwoFactorEnabled: user.TwoFactorEnabled,
            IsAdmin: user.IsAdmin,
            IsOwner: user.IsOwner,
            IsDisabled: user.IsDisabled,
            ForcePasswordChange: user.ForcePasswordChange,
            Policy: user.PolicyJson,
          };
        },
        getOptionalAuthUser: async () => {
          let token: string | null = null;

          const authHeader = headers['authorization'];
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          } else {
            token = getCookie(headers['cookie'], 'jwt');
          }

          if (!token) return null;
          const payload = await verifyToken(token);
          if (!payload) return null;

          const user = await userRepo.findById(payload.userId);
          if (!user) return null;

          userRepo.updateLastOnline(user.Id).catch(console.error);

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
            EmailVerified: user.EmailVerified,
            TwoFactorEnabled: user.TwoFactorEnabled,
            IsAdmin: user.IsAdmin,
            IsOwner: user.IsOwner,
          };
        },
      };
    });
}

export const authRoutes = (useCases: AuthUseCases, userRepo: UserRepository) => new Elysia()
  .use(createAuthMiddleware(userRepo))
  .get('/api/users/:userId/preview', async ({ params: { userId }, getOptionalAuthUser }) => {
    let viewerId: string | undefined;
    try {
      const viewer = await getOptionalAuthUser();
      if (viewer) {
        viewerId = viewer.userId;
      }
    } catch {
      // Ignore auth errors for preview
    }
    const preview = await useCases.userPreview.execute(userId, viewerId);
    if (!preview) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }
    return { success: true, User: preview };
  }, {
    detail: {
      tags: ['Users'],
      summary: 'Get public user preview profile',
      description: 'Returns public user profile information like display name, username, bio, join date, theme, and avatar.',
    },
  })

  .get('/api/themes/custom', async ({ getAuthUser }) => {
    const authUser = await getAuthUser();
    const themes = await useCases.listCustomThemes.execute(authUser.userId);
    return { success: true, Themes: themes };
  }, {
    detail: {
      tags: ['Themes'],
      summary: 'Get custom themes of active user',
      description: 'Returns all database-persisted custom themes created by the authenticated user.',
      security: [{ bearerAuth: [] }],
    },
  })

  .post('/api/themes/custom', async ({ getAuthUser, body: { Giftistry: { Theme } } }) => {
    const authUser = await getAuthUser();
    const saved = await useCases.saveCustomTheme.execute(authUser.userId, {
      id: Theme.id,
      name: Theme.name,
      colors: Theme.colors,
      advanced: Theme.advanced,
    });
    return { success: true, Theme: saved };
  }, {
    detail: {
      tags: ['Themes'],
      summary: 'Create or update a custom theme',
      description: 'Persists custom theme details in the database.',
      security: [{ bearerAuth: [] }],
    },
    body: t.Object({
      Giftistry: t.Object({
        Theme: t.Object({
          id: t.String(),
          name: t.String(),
          colors: t.Object({
            primary: t.String(),
            bg: t.String(),
            surface: t.String(),
            border: t.String(),
            text: t.String(),
            'text-muted': t.Optional(t.String()),
          }),
          advanced: t.Optional(t.Object({
            shadows: t.Optional(t.Object({
              sm: t.Optional(t.String()),
              md: t.Optional(t.String()),
              lg: t.Optional(t.String()),
            })),
            fonts: t.Optional(t.Object({
              sans: t.Optional(t.String()),
            })),
            radius: t.Optional(t.Object({
              default: t.Optional(t.String()),
            })),
          })),
        }),
      }),
    }),
  })

  .delete('/api/themes/custom/:id', async ({ getAuthUser, params: { id } }) => {
    const authUser = await getAuthUser();
    await useCases.deleteCustomTheme.execute(authUser.userId, id);
    return { success: true };
  }, {
    detail: {
      tags: ['Themes'],
      summary: 'Delete a custom theme',
      description: 'Removes a custom theme by ID from the database.',
      security: [{ bearerAuth: [] }],
    },
  })

  .group('/api/auth', (group) => group
    .use(rateLimit({ windowMs: 60000, max: 5 }))
    .post('/signup', async ({ set, body: { Giftistry: { Auth: { username, email, password, firstName, lastName } } } }) => {
      const user = await useCases.signup.execute(username, email, password, firstName ?? undefined, lastName ?? undefined);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      return { success: true, User: user, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Creates a new user profile, generates email verification, and sets the JWT session cookie.',
      },
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            username: t.String({ minLength: 3, maxLength: 50 }),
            email: t.String({ format: 'email' }),
            firstName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
            lastName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
            password: t.String({ minLength: 6 }),
          }),
        }),
      }),
    })
    .post('/login', async ({ set, body: { Giftistry: { Auth: { email, password } } } }) => {
      const user = await useCases.login.execute(email, password);

      if (user.TwoFactorEnabled) {
        const ticket = await useCases.twoFactorLogin.createTicket(user.Id);
        return { success: true, Require2FA: true, Ticket: ticket };
      }

      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      return { success: true, User: user, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Authenticate a user',
        description: 'Verifies email/password and sets the HTTP-only JWT session cookie. Redirects to 2FA if enabled.',
      },
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            email: t.String(),
            password: t.String(),
          }),
        }),
      }),
    })
    .post('/verify-email', async ({ body: { Giftistry: { Auth: { token } } } }) => {
      await useCases.verifyEmail.execute(token);
      return { success: true };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            token: t.String(),
          }),
        }),
      }),
    })
    .post('/passkey/login/options', async ({ set }) => {
      const { options, challenge } = await useCases.passkeyLogin.generateOptions();
      setPasskeyChallengeCookie(set, challenge);
      return { success: true, options };
    })
    .post('/passkey/login/verify', async ({ set, headers, body: { Giftistry: { Auth: { authenticationResponse } } } }) => {
      const challenge = getCookie(headers['cookie'], 'passkey_challenge');
      const origin = headers['origin'] || 'http://localhost:3000';
      const user = await useCases.passkeyLogin.verify(authenticationResponse, challenge || '', origin);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      return { success: true, User: user, Token: token };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            authenticationResponse: t.Any(),
          }),
        }),
      }),
    })
    .post('/2fa/login', async ({ set, body: { Giftistry: { Auth: { ticket, code } } } }) => {
      const user = await useCases.twoFactorLogin.execute(ticket, code);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      return { success: true, User: user, Token: token };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            ticket: t.String(),
            code: t.String(),
          }),
        }),
      }),
    })
    .use(createAuthMiddleware(userRepo))
    .get('/me', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const user = await useCases.getCurrentUser.execute(authUser.userId);
      return { success: true, User: user };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Get active user profile',
        description: 'Extracts the JWT from cookie/bearer token and returns the authenticated user context.',
        security: [{ bearerAuth: [] }],
      },
    })
    .get('/passkeys', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const passkeys = await useCases.listPasskeys.execute(authUser.userId);
      return { success: true, Passkeys: passkeys };
    })
    .delete('/passkeys/:passkeyId', async ({ getAuthUser, params: { passkeyId } }) => {
      const authUser = await getAuthUser();
      await useCases.deletePasskey.execute(authUser.userId, passkeyId);
      return { success: true };
    })
    .post('/logout', async ({ set }) => {
      clearJwtCookie(set);
      return { success: true };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Clears the JWT session cookie.',
      },
    })
    .put('/profile', async ({ getAuthUser, body: { Giftistry: { Auth: { username, firstName, lastName, bio, theme, avatar } } } }) => {
      const authUser = await getAuthUser();

      if (avatar !== undefined && avatar !== null) {
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
          const maxSize = 2 * 1024 * 1024;
          if (sizeInBytes > maxSize) {
            throw new AppError('Image size exceeds the 2MB limit.', 400, 'BAD_REQUEST');
          }
        } else if (!isAvatarColor(avatar)) {
          throw new AppError('Invalid avatar format. Use an uploaded image or hsl color.', 400, 'BAD_REQUEST');
        }
      }

      const user = await useCases.updateProfile.execute(authUser.userId, {
        username,
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        bio: bio ?? undefined,
        theme: theme ?? undefined,
        avatar: avatar !== undefined ? avatar : undefined,
      });

      return { success: true, User: user };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Update user profile details',
        description: 'Updates username, first name, last name, bio, theme, or avatar of the active user profile.',
        security: [{ bearerAuth: [] }],
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
          }),
        }),
      }),
    })
    .post('/resend-verification', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      await useCases.resendVerification.execute(authUser.userId, authUser.email, authUser.Username);
      return { success: true };
    })
    .post('/account/disable', async ({ getAuthUser, request }) => {
      const authUser = await getAuthUser();
      await useCases.disableAccount.execute(authUser.userId, Boolean(authUser.IsOwner), request.headers.get('x-forwarded-for'));
      return { success: true };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Disable own account',
        security: [{ bearerAuth: [] }],
      },
    })
    .delete('/account', async ({ getAuthUser, body: { Giftistry: { Auth: { password } } }, request, set }) => {
      const authUser = await getAuthUser();
      await useCases.deleteAccount.execute(authUser.userId, Boolean(authUser.IsOwner), password, request.headers.get('x-forwarded-for'));
      clearJwtCookie(set);
      return { success: true };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Delete own account',
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            password: t.String(),
          }),
        }),
      }),
    })
    .post('/2fa/setup', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const { secret, qrCodeUrl } = await useCases.setup2fa.execute(authUser.email);
      return { success: true, Secret: secret, QrCodeUrl: qrCodeUrl };
    })
    .post('/2fa/enable', async ({ getAuthUser, body: { Giftistry: { Auth: { secret, code } } } }) => {
      const authUser = await getAuthUser();
      const recoveryCodes = await useCases.enable2fa.execute(authUser.userId, secret, code);
      return { success: true, RecoveryCodes: recoveryCodes };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            secret: t.String(),
            code: t.String(),
          }),
        }),
      }),
    })
    .post('/2fa/disable', async ({ getAuthUser, body: { Giftistry: { Auth: { code } } } }) => {
      const authUser = await getAuthUser();
      await useCases.disable2fa.execute(authUser.userId, code);
      return { success: true };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            code: t.String(),
          }),
        }),
      }),
    })
    .post('/passkey/register/options', async ({ getAuthUser, set }) => {
      const authUser = await getAuthUser();
      const { options, challenge } = await useCases.registerPasskey.generateOptions(
        authUser.userId,
        authUser.Username,
        authUser.FirstName,
        authUser.LastName
      );
      setPasskeyChallengeCookie(set, challenge);
      return { success: true, options };
    })
    .post('/passkey/register/verify', async ({ getAuthUser, headers, body: { Giftistry: { Auth: { registrationResponse } } } }) => {
      const authUser = await getAuthUser();
      const challenge = getCookie(headers['cookie'], 'passkey_challenge');
      const origin = headers['origin'] || 'http://localhost:3000';
      await useCases.registerPasskey.verify(authUser.userId, registrationResponse, challenge || '', origin);
      return { success: true };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            registrationResponse: t.Any(),
          }),
        }),
      }),
    })
  );
