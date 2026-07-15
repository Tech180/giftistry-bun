import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { AdminUser } from '../domain/admin-user.entity';
import type { AdminUseCases } from './admin-use-cases.interface';
import type { CreateAdminUserPayload } from '../application/create-admin-user.use-case';
import type { UpdateAdminUserPayload } from '../application/update-admin-user.use-case';
import type { ResetPasswordPayload } from '../application/reset-user-password.use-case';
import type { UserPolicyUpdatePayload } from '../domain/admin-user.entity';

function mapCreateAdminUserPayload(raw: {
  Username: string;
  Email: string;
  Password: string;
  FirstName?: string;
  LastName?: string;
  IsAdmin?: boolean;
  EmailVerified?: boolean;
  ForcePasswordChange?: boolean;
  Policy?: Record<string, unknown>;
}): CreateAdminUserPayload {
  return {
    username: raw.Username,
    email: raw.Email,
    password: raw.Password,
    firstName: raw.FirstName,
    lastName: raw.LastName,
    isAdmin: raw.IsAdmin,
    emailVerified: raw.EmailVerified,
    forcePasswordChange: raw.ForcePasswordChange,
    policy: raw.Policy,
  };
}

function mapUpdateAdminUserPayload(raw: {
  Username?: string;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  Bio?: string;
  Avatar?: string | null;
  EmailVerified?: boolean;
}): UpdateAdminUserPayload {
  return {
    username: raw.Username,
    email: raw.Email,
    firstName: raw.FirstName,
    lastName: raw.LastName,
    bio: raw.Bio,
    avatar: raw.Avatar,
    emailVerified: raw.EmailVerified,
  };
}

function mapUserPolicyPayload(raw: {
  IsAdmin?: boolean;
  IsDisabled?: boolean;
  IsHidden?: boolean;
  ForcePasswordChange?: boolean;
  LoginAttemptsBeforeLockout?: number;
  Policy?: unknown;
}): UserPolicyUpdatePayload {
  return {
    isAdmin: raw.IsAdmin,
    isDisabled: raw.IsDisabled,
    isHidden: raw.IsHidden,
    forcePasswordChange: raw.ForcePasswordChange,
    loginAttemptsBeforeLockout: raw.LoginAttemptsBeforeLockout,
    policy: raw.Policy,
  };
}

function mapResetPasswordPayload(raw: {
  Password: string;
  ForcePasswordChange?: boolean;
}): ResetPasswordPayload {
  return {
    password: raw.Password,
    forcePasswordChange: raw.ForcePasswordChange,
  };
}

const giftistryUserPolicySchema = t.Object({
  CanCreateWishlists: t.Optional(t.Boolean()),
  MaxActiveWishlists: t.Optional(t.Number()),
  CanUseComments: t.Optional(t.Boolean()),
  CanUseAiFeatures: t.Optional(t.Boolean()),
  CanSharePublicLinks: t.Optional(t.Boolean()),
  CanUploadImages: t.Optional(t.Boolean()),
  CanSendFriendRequests: t.Optional(t.Boolean()),
  CanUseCustomThemes: t.Optional(t.Boolean()),
});

const sitePolicySchema = t.Object({
  RegistrationMode: t.Optional(t.Union([
    t.Literal('open'),
    t.Literal('invite_only'),
    t.Literal('disabled'),
  ])),
  RequireEmailVerification: t.Optional(t.Boolean()),
  LoginAttemptsBeforeLockout: t.Optional(t.Number()),
  LockoutDurationMinutes: t.Optional(t.Number()),
  MaintenanceMode: t.Optional(t.Boolean()),
  MaintenanceMessage: t.Optional(t.String()),
  AllowPasswordLogin: t.Optional(t.Boolean()),
  AllowedEmailDomains: t.Optional(t.Array(t.String())),
  DefaultUserPolicy: t.Optional(giftistryUserPolicySchema),
});

export const adminRoutes = (useCases: AdminUseCases) => new Elysia({ prefix: '/api/admin' })
  .use(authMiddleware)
  .get('/overview', async ({ getAuthUser }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.getOverview.execute();
    return { success: true, ...result };
  })
  .get('/users', async ({ getAuthUser, query }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.listUsers.execute(query);
    return { success: true, ...result };
  })
  .post('/users', async ({ getAuthUser, body: { Giftistry: { AdminUser: payload } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    const result = await useCases.createUser.execute(
      admin.Id,
      mapCreateAdminUserPayload(payload),
      request.headers.get('x-forwarded-for')
    );
    return { success: true, ...result };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        AdminUser: t.Object({
          Username: t.String(),
          Email: t.String(),
          Password: t.String(),
          FirstName: t.Optional(t.String()),
          LastName: t.Optional(t.String()),
          IsAdmin: t.Optional(t.Boolean()),
          EmailVerified: t.Optional(t.Boolean()),
          ForcePasswordChange: t.Optional(t.Boolean()),
          Policy: t.Optional(giftistryUserPolicySchema),
        }),
      }),
    }),
  })
  .get('/users/:id', async ({ getAuthUser, params: { id } }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.getUser.execute(id);
    return { success: true, ...result };
  })
  .patch('/users/:id', async ({ getAuthUser, params: { id }, body: { Giftistry: { User: updates } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.updateUser.execute(admin.Id, id, mapUpdateAdminUserPayload(updates), request.headers.get('x-forwarded-for'));
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        User: t.Object({
          Username: t.Optional(t.String()),
          Email: t.Optional(t.String()),
          FirstName: t.Optional(t.String()),
          LastName: t.Optional(t.String()),
          Bio: t.Optional(t.String()),
          Avatar: t.Optional(t.Union([t.String(), t.Null()])),
          EmailVerified: t.Optional(t.Boolean()),
        }),
      }),
    }),
  })
  .patch('/users/:id/policy', async ({ getAuthUser, params: { id }, body: { Giftistry: { Policy: policyPayload } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.updateUserPolicy.execute(
      admin.Id,
      id,
      mapUserPolicyPayload(policyPayload),
      request.headers.get('x-forwarded-for')
    );
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Policy: t.Object({
          IsAdmin: t.Optional(t.Boolean()),
          IsDisabled: t.Optional(t.Boolean()),
          IsHidden: t.Optional(t.Boolean()),
          ForcePasswordChange: t.Optional(t.Boolean()),
          LoginAttemptsBeforeLockout: t.Optional(t.Number()),
          Policy: t.Optional(giftistryUserPolicySchema),
        }),
      }),
    }),
  })
  .post('/users/:id/reset-password', async ({ getAuthUser, params: { id }, body: { Giftistry: { Password: payload } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.resetPassword.execute(admin.Id, id, mapResetPasswordPayload(payload), request.headers.get('x-forwarded-for'));
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Password: t.Object({
          Password: t.String(),
          ForcePasswordChange: t.Optional(t.Boolean()),
        }),
      }),
    }),
  })
  .post('/users/:id/unlock', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.unlockUser.execute(admin.Id, id, request.headers.get('x-forwarded-for'));
    return { success: true };
  })
  .post('/users/:id/revoke-sessions', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.revokeSessions.execute(admin.Id, id, request.headers.get('x-forwarded-for'));
    return { success: true };
  })
  .delete('/users/:id', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.deleteUser.execute(admin.Id, id, request.headers.get('x-forwarded-for'));
    return { success: true };
  })
  .get('/site-policy', async ({ getAuthUser }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.getSitePolicy.execute();
    return { success: true, ...result };
  })
  .patch('/site-policy', async ({ getAuthUser, body: { Giftistry: { SitePolicy: policy } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    const result = await useCases.saveSitePolicy.execute(
      admin.Id,
      policy,
      request.headers.get('x-forwarded-for')
    );
    return { success: true, ...result };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        SitePolicy: sitePolicySchema,
      }),
    }),
  })
  .get('/audit', async ({ getAuthUser, query }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.listAuditLog.execute(query);
    return { success: true, ...result };
  })
  .get('/moderation/comments', async ({ getAuthUser, query }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.moderateComment.list(query);
    return { success: true, ...result };
  })
  .delete('/moderation/comments/:id', async ({ getAuthUser, params: { id }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.moderateComment.delete(admin.Id, id, request.headers.get('x-forwarded-for'));
    return { success: true };
  })
  .get('/reports', async ({ getAuthUser, query }) => {
    AdminUser.assertAdmin(await getAuthUser());
    const result = await useCases.handleReport.list(query);
    return { success: true, ...result };
  })
  .patch('/reports/:id', async ({ getAuthUser, params: { id }, body: { Giftistry: { Report: payload } }, request }) => {
    const admin = await getAuthUser();
    AdminUser.assertAdmin(admin);
    await useCases.handleReport.handle(
      admin.Id,
      id,
      payload.Status,
      request.headers.get('x-forwarded-for')
    );
    return { success: true };
  }, {
    body: t.Object({
      Giftistry: t.Object({
        Report: t.Object({
          Status: t.Union([t.Literal('open'), t.Literal('resolved'), t.Literal('dismissed')]),
        }),
      }),
    }),
  });
