import { Elysia, t } from 'elysia';
import { createToken, verifyToken } from '@/common/utils/token';
import { AppError } from '@/common/middlewares/error.middleware';
import type { AuthUseCases } from './auth-use-cases.interface';
import { PostgresUserRepository } from '../infrastructure/postgres-user.repository';
import { PostgresPasskeyRepository } from '../infrastructure/postgres-passkey.repository';
import { SmtpEmailService } from '@/common/services/email.service';
import { rateLimit } from '@/common/middlewares/rate-limit.middleware';
import { isAvatarColor } from '@/common/utils/avatar.util';
import { sql } from '@/common/database/connection';
import { writeAuditLog } from '@/common/services/audit-log.service';
import { generateSecret, generateURI, verify, generate } from 'otplib';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const userRepo = new PostgresUserRepository();
const passkeyRepo = new PostgresPasskeyRepository();
const emailService = new SmtpEmailService();

const rpName = 'Giftistry';
const rpID = 'localhost';

const getCookie = (cookieHeader: string | undefined, name: string): string | null => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

async function countEnabledAdmins(excludeUserId?: string): Promise<number> {
  const rows = excludeUserId
    ? await sql<any[]>`
        SELECT COUNT(*)::integer as count FROM users
        WHERE is_admin = true AND is_disabled = false AND id != ${excludeUserId}
      `
    : await sql<any[]>`
        SELECT COUNT(*)::integer as count FROM users
        WHERE is_admin = true AND is_disabled = false
      `;
  return rows[0]?.count ?? 0;
}

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
          token = getCookie(headers['cookie'], 'jwt');
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
      }
    };
  });

export const authRoutes = (useCases: AuthUseCases) => new Elysia()
  .use(authMiddleware)
  .get('/api/users/:userId/preview', async ({ params: { userId }, getOptionalAuthUser }) => {
    let viewerId: string | undefined;
    try {
      const viewer = await getOptionalAuthUser();
      if (viewer) {
        viewerId = viewer.userId;
      }
    } catch (e) {
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
      description: 'Returns public user profile information like display name, username, bio, join date, theme, and avatar.'
    }
  })

  // Get custom themes for active user
  .get('/api/themes/custom', async ({ getAuthUser }) => {
    const authUser = await getAuthUser();
    const themes = await sql`
      SELECT id as "Id", name as "Name", colors as "Colors", advanced as "Advanced"
      FROM user_custom_themes
      WHERE user_id = ${authUser.userId}
      ORDER BY created_at DESC
    `;
    return { success: true, Themes: themes };
  }, {
    detail: {
      tags: ['Themes'],
      summary: 'Get custom themes of active user',
      description: 'Returns all database-persisted custom themes created by the authenticated user.',
      security: [{ bearerAuth: [] }]
    }
  })

  // Upsert custom theme
  .post('/api/themes/custom', async ({ getAuthUser, body: { Giftistry: { Theme } } }) => {
    const authUser = await getAuthUser();
    const { assertUserCan } = await import('@/common/services/user-policy.service');
    await assertUserCan(authUser.userId, 'canUseCustomThemes');
    const [saved] = await sql`
      INSERT INTO user_custom_themes (id, user_id, name, colors, advanced)
      VALUES (${Theme.id}, ${authUser.userId}, ${Theme.name}, ${JSON.stringify(Theme.colors)}, ${JSON.stringify(Theme.advanced || {})})
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, colors = EXCLUDED.colors, advanced = EXCLUDED.advanced
      RETURNING id as "Id", name as "Name", colors as "Colors", advanced as "Advanced"
    `;
    return { success: true, Theme: saved };
  }, {
    detail: {
      tags: ['Themes'],
      summary: 'Create or update a custom theme',
      description: 'Persists custom theme details in the database.',
      security: [{ bearerAuth: [] }]
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
        })
      })
    })
  })

  // Delete custom theme
  .delete('/api/themes/custom/:id', async ({ getAuthUser, params: { id } }) => {
    const authUser = await getAuthUser();
    await sql`
      DELETE FROM user_custom_themes
      WHERE id = ${id} AND user_id = ${authUser.userId}
    `;
    return { success: true };
  }, {
    detail: {
      tags: ['Themes'],
      summary: 'Delete a custom theme',
      description: 'Removes a custom theme by ID from the database.',
      security: [{ bearerAuth: [] }]
    }
  })

  .group('/api/auth', (group) => group
    .use(rateLimit({ windowMs: 60000, max: 5 }))
    .post('/signup', async ({ set, body: { Giftistry: { Auth: { username, email, password, firstName, lastName } } } }) => {
      const user = await useCases.signup.execute(username, email, password, firstName ?? undefined, lastName ?? undefined);
      
      // Generate email verification token upon signup
      const verificationToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await userRepo.update(user.Id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: expiresAt
      });

      // Send verification email asynchronously
      emailService.sendVerificationEmail(user.Email, user.Username, verificationToken).catch(console.error);

      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      
      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? 'Secure; ' : '';
      set.headers['Set-Cookie'] = `jwt=${token}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=86400`;
      
      return { success: true, User: user, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        description: 'Creates a new user profile, generates email verification, and sets the JWT session cookie.'
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

      // Check if user has 2FA enabled
      if (user.TwoFactorEnabled) {
        // Issue a short-lived 2FA ticket (valid for 5 minutes / 300,000 ms)
        const ticket = await createToken({ userId: user.Id, action: '2fa_login' }, 300 * 1000);
        let autoCode: string | undefined = undefined;
        if (process.env.NODE_ENV !== 'production') {
          const [curr] = await sql<any[]>`SELECT two_factor_secret FROM users WHERE id = ${user.Id}`;
          if (curr && curr.two_factor_secret) {
            autoCode = await generate({ secret: curr.two_factor_secret });
          }
        }
        return { success: true, Require2FA: true, Ticket: ticket, Code: autoCode };
      }

      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      
      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? 'Secure; ' : '';
      set.headers['Set-Cookie'] = `jwt=${token}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=86400`;
      
      return { success: true, User: user, Token: token };
    }, {
      detail: {
        tags: ['Authentication'],
        summary: 'Authenticate a user',
        description: 'Verifies email/password and sets the HTTP-only JWT session cookie. Redirects to 2FA if enabled.'
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

    // Email verification verification (unauthenticated endpoint)
    .post('/verify-email', async ({ body: { Giftistry: { Auth: { token } } } }) => {
      const [userRow] = await sql<any[]>`
        SELECT id, email_verification_expires FROM users WHERE email_verification_token = ${token}
      `;
      if (!userRow) {
        throw new AppError('Invalid verification token', 400, 'BAD_REQUEST');
      }
      if (new Date(userRow.email_verification_expires) < new Date()) {
        throw new AppError('Verification token has expired', 400, 'BAD_REQUEST');
      }

      await userRepo.update(userRow.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      });

      return { success: true };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            token: t.String()
          })
        })
      })
    })

    // Passkey Login Options (unauthenticated)
    .post('/passkey/login/options', async ({ set, headers }) => {
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: [],
        userVerification: 'preferred',
      });
      const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
      set.headers['Set-Cookie'] = `passkey_challenge=${encodeURIComponent(options.challenge)}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=300`;
      return { success: true, options };
    })

    // Passkey Login Verify (unauthenticated)
    .post('/passkey/login/verify', async ({ set, headers, body: { Giftistry: { Auth: { authenticationResponse } } } }) => {
      const challenge = getCookie(headers['cookie'], 'passkey_challenge');
      if (!challenge) {
        throw new AppError('Missing authentication challenge. Please request login options again.', 400, 'BAD_REQUEST');
      }

      const passkey = await passkeyRepo.findByCredentialId(authenticationResponse.id);
      if (!passkey) {
        throw new AppError('Passkey not registered on this server', 404, 'NOT_FOUND');
      }

      const origin = headers['origin'] || 'http://localhost:3000';
      const verification = await verifyAuthenticationResponse({
        response: authenticationResponse as any,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.CredentialId,
          publicKey: new Uint8Array(Buffer.from(passkey.PublicKey, 'base64')),
          counter: passkey.Counter,
        },
      });

      if (!verification.verified) {
        throw new AppError('Passkey verification failed', 401, 'UNAUTHORIZED');
      }

      await passkeyRepo.updateCounter(passkey.CredentialId, verification.authenticationInfo.newCounter);
      const user = await userRepo.findById(passkey.UserId);
      if (!user) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }



      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
      set.headers['Set-Cookie'] = `jwt=${token}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=86400`;
      
      return { success: true, User: user, Token: token };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            authenticationResponse: t.Any()
          })
        })
      })
    })

    // 2FA login verification
    .post('/2fa/login', async ({ set, body: { Giftistry: { Auth: { ticket, code } } } }) => {
      const payload = await verifyToken(ticket);
      if (!payload || payload.action !== '2fa_login') {
        throw new AppError('Invalid or expired 2FA login session', 400, 'BAD_REQUEST');
      }

      const user = await userRepo.findById(payload.userId);
      if (!user) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      const [curr] = await sql<any[]>`SELECT two_factor_secret, two_factor_recovery_codes FROM users WHERE id = ${user.Id}`;
      if (!curr || !curr.two_factor_secret) {
        throw new AppError('2FA is not set up for this account', 400, 'BAD_REQUEST');
      }

      let isVerified = false;
      if (code.trim().length === 6) {
        try {
          isVerified = (await verify({
            token: code,
            secret: curr.two_factor_secret,
          })).valid;
        } catch (e) {
          // Ignore validation errors from otplib for non-6-digit tokens
        }
      }

      let usedRecoveryCode = false;
      if (!isVerified && curr.two_factor_recovery_codes) {
        const codes = curr.two_factor_recovery_codes.split(',');
        const idx = codes.findIndex((c: string) => c.toUpperCase() === code.toUpperCase().trim());
        if (idx !== -1) {
          isVerified = true;
          usedRecoveryCode = true;
          // Consume this recovery code
          codes.splice(idx, 1);
          await userRepo.update(user.Id, {
            twoFactorRecoveryCodes: codes.length > 0 ? codes.join(',') : null
          });
        }
      }

      if (!isVerified) {
        throw new AppError('Invalid 2FA code', 401, 'UNAUTHORIZED');
      }

      const token = await createToken({ userId: user.Id, sessionVersion: user.SessionVersion ?? 0 });
      const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
      set.headers['Set-Cookie'] = `jwt=${token}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=86400`;

      return { success: true, User: user, Token: token };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            ticket: t.String(),
            code: t.String(),
          })
        })
      })
    })

    // --- Authenticated routes ---
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
    .get('/passkeys', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const userPasskeys = await passkeyRepo.findByUserId(authUser.userId);
      return {
        success: true,
        Passkeys: userPasskeys.map(pk => ({
          Id: pk.Id,
          CredentialId: pk.CredentialId,
          Counter: pk.Counter,
          BackedUp: pk.BackedUp,
          Transports: pk.Transports
        }))
      };
    })
    .delete('/passkeys/:passkeyId', async ({ getAuthUser, params: { passkeyId } }) => {
      const authUser = await getAuthUser();
      const passkey = await passkeyRepo.findById(passkeyId);
      if (!passkey) {
        throw new AppError('Passkey not found', 404, 'NOT_FOUND');
      }
      if (passkey.UserId !== authUser.userId) {
        throw new AppError('Unauthorized access to passkey', 403, 'FORBIDDEN');
      }
      await passkeyRepo.delete(passkeyId);
      return { success: true };
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

      // Backend avatar validation: image data URL or hsl color
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
          const maxSize = 2 * 1024 * 1024; // 2MB limit
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

    // Custom theme routes moved to root level of authRoutes

    // Resend Email Verification Token
    .post('/resend-verification', async ({ getAuthUser }) => {
      const authUser = await getAuthUser();
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await userRepo.update(authUser.userId, {
        emailVerificationToken: token,
        emailVerificationExpires: expiresAt
      });

      await emailService.sendVerificationEmail(authUser.email, authUser.Username, token);
      return { success: true };
    })

    .post('/account/disable', async ({ getAuthUser, request }) => {
      const authUser = await getAuthUser();

      if (authUser.IsOwner) {
        throw new AppError('Cannot disable the server owner. Transfer ownership or delete the server first.', 400, 'BAD_REQUEST');
      }

      const [target] = await sql<any[]>`
        SELECT id, is_admin, is_disabled FROM users WHERE id = ${authUser.userId}
      `;
      if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

      if (target.is_admin && !target.is_disabled) {
        const others = await countEnabledAdmins(authUser.userId);
        if (others === 0) {
          throw new AppError('Cannot disable the last administrator', 400, 'BAD_REQUEST');
        }
      }

      await sql`
        UPDATE users SET
          is_disabled = true,
          session_version = session_version + 1
        WHERE id = ${authUser.userId}
      `;

      await writeAuditLog({
        actorId: authUser.userId,
        targetId: authUser.userId,
        action: 'auth.account.disable',
        ip: request.headers.get('x-forwarded-for'),
      });

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

      if (authUser.IsOwner) {
        throw new AppError('Cannot delete the server owner. Transfer ownership or delete the server first.', 400, 'BAD_REQUEST');
      }

      if (!password) {
        throw new AppError('Password is required', 400, 'BAD_REQUEST');
      }

      const [target] = await sql<any[]>`
        SELECT id, auth_hash, is_admin, is_disabled FROM users WHERE id = ${authUser.userId}
      `;
      if (!target) throw new AppError('User not found', 404, 'NOT_FOUND');

      const isMatch = await Bun.password.verify(password, target.auth_hash);
      if (!isMatch) {
        throw new AppError('Invalid password', 401, 'UNAUTHORIZED');
      }

      if (target.is_admin && !target.is_disabled) {
        const others = await countEnabledAdmins(authUser.userId);
        if (others === 0) {
          throw new AppError('Cannot delete the last administrator', 400, 'BAD_REQUEST');
        }
      }

      await writeAuditLog({
        actorId: authUser.userId,
        targetId: authUser.userId,
        action: 'auth.account.delete',
        ip: request.headers.get('x-forwarded-for'),
      });

      await sql`DELETE FROM users WHERE id = ${authUser.userId}`;

      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? 'Secure; ' : '';
      set.headers['Set-Cookie'] = `jwt=; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=0`;

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
      const secret = generateSecret();
      const otpauth = generateURI({ label: authUser.email, issuer: 'Giftistry', secret });
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;

      return { success: true, Secret: secret, QrCodeUrl: qrCodeUrl };
    })
    .post('/2fa/enable', async ({ getAuthUser, body: { Giftistry: { Auth: { secret, code } } } }) => {
      const authUser = await getAuthUser();
      const isVerified = (await verify({ token: code, secret })).valid;
      if (!isVerified) {
        throw new AppError('Invalid 2FA verification code', 400, 'BAD_REQUEST');
      }

      const recoveryCodesArray = Array.from({ length: 8 }, () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      });
      const recoveryCodesStr = recoveryCodesArray.join(',');

      await userRepo.update(authUser.userId, {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
        twoFactorRecoveryCodes: recoveryCodesStr,
      });

      return { success: true, RecoveryCodes: recoveryCodesArray };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            secret: t.String(),
            code: t.String(),
          })
        })
      })
    })
    .post('/2fa/disable', async ({ getAuthUser, body: { Giftistry: { Auth: { code } } } }) => {
      const authUser = await getAuthUser();
      const [curr] = await sql<any[]>`SELECT two_factor_secret, two_factor_recovery_codes FROM users WHERE id = ${authUser.userId}`;
      if (!curr || !curr.two_factor_secret) {
        throw new AppError('2FA is not enabled', 400, 'BAD_REQUEST');
      }

      let isVerified = false;
      if (code.trim().length === 6) {
        try {
          isVerified = (await verify({ token: code, secret: curr.two_factor_secret })).valid;
        } catch (e) {
          // Ignore
        }
      }

      // If not verified, check if it's a valid recovery code
      if (!isVerified && curr.two_factor_recovery_codes) {
        const codes = curr.two_factor_recovery_codes.split(',');
        isVerified = codes.some((c: string) => c.toUpperCase() === code.toUpperCase().trim());
      }

      if (!isVerified) {
        throw new AppError('Invalid 2FA verification code', 400, 'BAD_REQUEST');
      }

      await userRepo.update(authUser.userId, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorRecoveryCodes: null,
      });

      return { success: true };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            code: t.String(),
          })
        })
      })
    })

    // WebAuthn Passkeys Endpoints
    .post('/passkey/register/options', async ({ getAuthUser, set }) => {
      const authUser = await getAuthUser();
      const userPasskeys = await passkeyRepo.findByUserId(authUser.userId);

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: new TextEncoder().encode(authUser.userId),
        userName: authUser.Username,
        userDisplayName: `${authUser.FirstName} ${authUser.LastName}`.trim() || authUser.Username,
        excludeCredentials: userPasskeys.map((pk) => ({
          id: pk.CredentialId,
          type: 'public-key',
        })),
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'preferred',
          authenticatorAttachment: 'platform',
        },
      });

      const secureFlag = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
      set.headers['Set-Cookie'] = `passkey_challenge=${encodeURIComponent(options.challenge)}; HttpOnly; ${secureFlag}SameSite=Strict; Path=/; Max-Age=300`;

      return { success: true, options };
    })
    .post('/passkey/register/verify', async ({ getAuthUser, headers, body: { Giftistry: { Auth: { registrationResponse } } } }) => {
      const authUser = await getAuthUser();
      const challenge = getCookie(headers['cookie'], 'passkey_challenge');
      if (!challenge) {
        throw new AppError('Missing registration challenge. Please request options again.', 400, 'BAD_REQUEST');
      }

      const origin = headers['origin'] || 'http://localhost:3000';
      const verification = await verifyRegistrationResponse({
        response: registrationResponse as any,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new AppError('Registration verification failed', 400, 'BAD_REQUEST');
      }

      const { id, publicKey, counter, transports } = verification.registrationInfo.credential;
      const pubKeyBase64 = Buffer.from(publicKey).toString('base64');

      await passkeyRepo.create(
        authUser.userId,
        id,
        pubKeyBase64,
        counter,
        verification.registrationInfo.credentialBackedUp || false,
        transports || []
      );

      return { success: true };
    }, {
      body: t.Object({
        Giftistry: t.Object({
          Auth: t.Object({
            registrationResponse: t.Any()
          })
        })
      })
    })
  );
