import { Elysia, t } from 'elysia';
import { createToken, verifyToken } from '@/common/utils/token';
import { AppError } from '@/common/middlewares/error.middleware';
import type { AuthUseCases } from './auth-use-cases.interface';
import type { UserRepository } from '../domain/ports/user.repository';
import { rateLimit } from '@/common/middlewares/rate-limit.middleware';
import { isAvatarColor } from '@/common/utils/avatar.util';
import { loadConfig } from '@/common/infrastructure/config.loader';
import { getPublicAppUrl } from '@/common/utils/public-app-url.util';

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
            IsOnboarded: user.IsOnboarded === true,
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
      id: Theme.Id,
      name: Theme.Name,
      colors: {
        primary: Theme.Colors.Primary,
        bg: Theme.Colors.Bg,
        surface: Theme.Colors.Surface,
        border: Theme.Colors.Border,
        text: Theme.Colors.Text,
        'text-muted': Theme.Colors.TextMuted,
      },
      advanced: Theme.Advanced ? {
        shadows: Theme.Advanced.Shadows ? {
          sm: Theme.Advanced.Shadows.Sm,
          md: Theme.Advanced.Shadows.Md,
          lg: Theme.Advanced.Shadows.Lg,
        } : undefined,
        fonts: Theme.Advanced.Fonts ? {
          sans: Theme.Advanced.Fonts.Sans,
        } : undefined,
        radius: Theme.Advanced.Radius ? {
          default: Theme.Advanced.Radius.Default,
        } : undefined,
      } : undefined,
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
          Id: t.String(),
          Name: t.String(),
          Colors: t.Object({
            Primary: t.String(),
            Bg: t.String(),
            Surface: t.String(),
            Border: t.String(),
            Text: t.String(),
            TextMuted: t.Optional(t.String()),
          }),
          Advanced: t.Optional(t.Object({
            Shadows: t.Optional(t.Object({
              Sm: t.Optional(t.String()),
              Md: t.Optional(t.String()),
              Lg: t.Optional(t.String()),
            })),
            Fonts: t.Optional(t.Object({
              Sans: t.Optional(t.String()),
            })),
            Radius: t.Optional(t.Object({
              Default: t.Optional(t.String()),
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
    .post('/signup', async ({ set, body: { Giftistry: { Auth: { Username, Email, Password, FirstName, LastName } } } }) => {
      const user = await useCases.signup.execute(Username, Email ?? null, Password, FirstName ?? undefined, LastName ?? undefined);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      return { success: true, User: user, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Creates a new user profile (email optional), optionally sends email verification, and sets the JWT session cookie.',
      },
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            Username: t.String({ minLength: 3, maxLength: 50 }),
            Email: t.Optional(t.Union([t.String({ format: 'email' }), t.Literal('')])),
            FirstName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
            LastName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
            Password: t.String({ minLength: 6 }),
          }),
        }),
      }),
    })
    .post('/login', async ({ set, body: { Giftistry: { Auth: { Username, Password } } } }) => {
      const user = await useCases.login.execute(Username, Password);

      if (user.TwoFactorEnabled) {
        const ticket = await useCases.twoFactorLogin.createTicket(user.Id);
        return { success: true, Require2FA: true, Ticket: ticket };
      }

      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      const passkeys = await useCases.listPasskeys.execute(user.Id);
      return { success: true, User: { ...user, HasPasskey: passkeys.length > 0 }, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Authenticate a user',
        description: 'Verifies username/password and sets the HTTP-only JWT session cookie. Redirects to 2FA if enabled.',
      },
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            Username: t.String(),
            Password: t.String(),
          }),
        }),
      }),
    })
    .post('/passkey/login/options', async ({ set }) => {
      const { options, challenge } = await useCases.passkeyLogin.generateOptions();
      setPasskeyChallengeCookie(set, challenge);
      return { success: true, options };
    })
    .post('/passkey/login/verify', async ({ set, headers, body: { Giftistry: { Auth: { AuthenticationResponse } } } }) => {
      const challenge = getCookie(headers['cookie'], 'passkey_challenge');
      const origin = headers['origin'] || 'http://localhost:3000';
      const user = await useCases.passkeyLogin.verify(AuthenticationResponse, challenge || '', origin);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      const passkeys = await useCases.listPasskeys.execute(user.Id);
      return { success: true, User: { ...user, HasPasskey: passkeys.length > 0 }, Token: token };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            AuthenticationResponse: t.Any(),
          }),
        }),
      }),
    })
    .post('/passkey/check', async ({ body: { Giftistry: { Auth: { Username } } } }) => {
      const user = await userRepo.findByUsername(Username);
      if (!user) {
        return { success: true, HasPasskey: false };
      }
      const passkeys = await useCases.listPasskeys.execute(user.Id);
      return { success: true, HasPasskey: passkeys.length > 0 };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            Username: t.String(),
          }),
        }),
      }),
    })
    .post('/2fa/login', async ({ set, body: { Giftistry: { Auth: { Ticket, Code } } } }) => {
      const user = await useCases.twoFactorLogin.execute(Ticket, Code);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);
      const passkeys = await useCases.listPasskeys.execute(user.Id);
      return { success: true, User: { ...user, HasPasskey: passkeys.length > 0 }, Token: token };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            Ticket: t.String(),
            Code: t.String(),
          }),
        }),
      }),
    })
    .get('/oauth/authorize', async ({ set }) => {
      const result = await useCases.beginOidcLogin.execute();
      set.status = 302;
      set.headers['Location'] = result.AuthorizationUrl;
      return '';
    })
    .get('/oauth/callback', async ({ query, set }) => {
      const code = typeof query.code === 'string' ? query.code : '';
      const state = typeof query.state === 'string' ? query.state : '';
      if (!code || !state) {
        throw new AppError('Missing OAuth callback parameters', 400, 'BAD_REQUEST');
      }

      const user = await useCases.handleOidcCallback.execute(code, state);
      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      setJwtCookie(set, token);

      const redirectBase = getPublicAppUrl() || 'http://localhost:3000';
      const redirectUrl = new URL('/login', redirectBase);
      redirectUrl.searchParams.set('token', token);
      if (user.IsOnboarded !== true) {
        redirectUrl.pathname = '/onboarding';
      }

      set.status = 302;
      set.headers['Location'] = redirectUrl.toString();
      return '';
    })
    .use(createAuthMiddleware(userRepo))
    .get('/me', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const user = await useCases.getCurrentUser.execute(authUser.userId);
      const config = loadConfig();
      const userPolicy = authUser.Policy as { CanUseAiFeatures?: boolean } | undefined;

      const canUseAi = Boolean(
        config.AiEnabled &&
        user.AiEnabled !== false &&
        userPolicy?.CanUseAiFeatures !== false
      );

      const canUseWebSearch = Boolean(
        config.AiEnabled &&
        config.AiWebSearchEnabled &&
        user.AiEnabled !== false &&
        user.WebSearchEnabled !== false &&
        userPolicy?.CanUseAiFeatures !== false
      );

      const passkeys = await useCases.listPasskeys.execute(user.Id);
      return {
        success: true,
        User: { ...user, HasPasskey: passkeys.length > 0 },
        Capabilities: {
          CanUseAi: canUseAi,
          CanUseWebSearch: canUseWebSearch,
        }
      };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Get active user profile',
        description: 'Extracts the JWT from cookie/bearer token and returns the authenticated user context with user capabilities.',
        security: [{ bearerAuth: [] }],
      },
    })
    .get('/onboarding', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const state = await useCases.getOnboardingState.execute(authUser.userId);
      return { success: true, ...state };
    })
    .patch('/onboarding', async ({ getAuthUser, body: { Giftistry: { Onboarding } } }) => {
      const authUser = await getAuthUser();
      const payload = Onboarding ?? {};

      if (payload.Username || payload.FirstName || payload.LastName || payload.Theme || payload.Bio) {
        await useCases.updateProfile.execute(authUser.userId, {
          username: payload.Username,
          firstName: payload.FirstName ?? undefined,
          lastName: payload.LastName ?? undefined,
          bio: payload.Bio ?? undefined,
          theme: payload.Theme ?? undefined,
        });
      }

      if (payload.CompleteOwner) {
        if (!authUser.IsOwner) {
          throw new AppError('Forbidden: Owner access required', 403, 'FORBIDDEN');
        }
        await useCases.completeOwnerOnboarding.execute(authUser.userId, {
          Skip: payload.SkipOwner === true,
          PublicAppUrl: payload.PublicAppUrl,
          RegistrationMode: payload.RegistrationMode,
          SmtpType: payload.SmtpType,
          SmtpHost: payload.SmtpHost,
          SmtpPort: payload.SmtpPort,
          SmtpUser: payload.SmtpUser,
          SmtpPass: payload.SmtpPass,
          SmtpSecure: payload.SmtpSecure,
          SmtpFrom: payload.SmtpFrom,
          AiEnabled: payload.AiEnabled,
          AiWebSearchEnabled: payload.AiWebSearchEnabled,
        });
      }

      let user = null;
      if (payload.CompleteUser) {
        user = await useCases.completeUserOnboarding.execute(authUser.userId);
      }

      const state = await useCases.getOnboardingState.execute(authUser.userId);
      return {
        success: true,
        ...state,
        ...(user ? { User: user } : {}),
      };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Onboarding: t.Object({
            SkipStep: t.Optional(t.String()),
            CompleteUser: t.Optional(t.Boolean()),
            CompleteOwner: t.Optional(t.Boolean()),
            SkipOwner: t.Optional(t.Boolean()),
            Username: t.Optional(t.String()),
            FirstName: t.Optional(t.String()),
            LastName: t.Optional(t.String()),
            Bio: t.Optional(t.String()),
            Theme: t.Optional(t.String()),
            PublicAppUrl: t.Optional(t.String()),
            RegistrationMode: t.Optional(t.Union([
              t.Literal('open'),
              t.Literal('invite_only'),
              t.Literal('disabled'),
            ])),
            SmtpType: t.Optional(t.Union([t.Literal('local'), t.Literal('remote')])),
            SmtpHost: t.Optional(t.String()),
            SmtpPort: t.Optional(t.Numeric()),
            SmtpUser: t.Optional(t.String()),
            SmtpPass: t.Optional(t.String()),
            SmtpSecure: t.Optional(t.Boolean()),
            SmtpFrom: t.Optional(t.String()),
            AiEnabled: t.Optional(t.Boolean()),
            AiWebSearchEnabled: t.Optional(t.Boolean()),
          }),
        }),
      }),
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
    .put('/profile', async ({ getAuthUser, body: { Giftistry: { Auth: { Username, FirstName, LastName, Bio, Theme, Avatar, AiEnabled, WebSearchEnabled } } } }) => {
      const authUser = await getAuthUser();

      if (Avatar !== undefined && Avatar !== null) {
        if (Avatar.startsWith('data:')) {
          const matches = Avatar.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
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
        } else if (!isAvatarColor(Avatar)) {
          throw new AppError('Invalid avatar format. Use an uploaded image or hsl color.', 400, 'BAD_REQUEST');
        }
      }

      const user = await useCases.updateProfile.execute(authUser.userId, {
        username: Username,
        firstName: FirstName ?? undefined,
        lastName: LastName ?? undefined,
        bio: Bio ?? undefined,
        theme: Theme ?? undefined,
        avatar: Avatar !== undefined ? Avatar : undefined,
        aiEnabled: AiEnabled,
        webSearchEnabled: WebSearchEnabled,
      });

      const passkeys = await useCases.listPasskeys.execute(user.Id);
      return { success: true, User: { ...user, HasPasskey: passkeys.length > 0 } };
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
            Username: t.Optional(t.String({ minLength: 3, maxLength: 50 })),
            FirstName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
            LastName: t.Optional(t.Nullable(t.String({ minLength: 1, maxLength: 100 }))),
            Bio: t.Optional(t.Nullable(t.String())),
            Theme: t.Optional(t.Nullable(t.String())),
            Avatar: t.Optional(t.Nullable(t.String())),
            AiEnabled: t.Optional(t.Boolean()),
            WebSearchEnabled: t.Optional(t.Boolean()),
          }),
        }),
      }),
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
    .delete('/account', async ({ getAuthUser, body: { Giftistry: { Auth: { Password } } }, request, set }) => {
      const authUser = await getAuthUser();
      await useCases.deleteAccount.execute(authUser.userId, Boolean(authUser.IsOwner), Password, request.headers.get('x-forwarded-for'));
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
            Password: t.String(),
          }),
        }),
      }),
    })
    .post('/2fa/setup', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const { secret, qrCodeUrl } = await useCases.setup2fa.execute(authUser.email);
      return { success: true, Secret: secret, QrCodeUrl: qrCodeUrl };
    })
    .post('/2fa/enable', async ({ getAuthUser, body: { Giftistry: { Auth: { Secret, Code } } } }) => {
      const authUser = await getAuthUser();
      const recoveryCodes = await useCases.enable2fa.execute(authUser.userId, Secret, Code);
      return { success: true, RecoveryCodes: recoveryCodes };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            Secret: t.String(),
            Code: t.String(),
          }),
        }),
      }),
    })
    .post('/2fa/disable', async ({ getAuthUser, body: { Giftistry: { Auth: { Code } } } }) => {
      const authUser = await getAuthUser();
      await useCases.disable2fa.execute(authUser.userId, Code);
      return { success: true };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            Code: t.String(),
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
    .post('/passkey/register/verify', async ({ getAuthUser, headers, body: { Giftistry: { Auth: { RegistrationResponse } } } }) => {
      const authUser = await getAuthUser();
      const challenge = getCookie(headers['cookie'], 'passkey_challenge');
      const origin = headers['origin'] || 'http://localhost:3000';
      await useCases.registerPasskey.verify(authUser.userId, RegistrationResponse, challenge || '', origin);
      return { success: true };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            RegistrationResponse: t.Any(),
          }),
        }),
      }),
    })
  );
