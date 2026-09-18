import { Elysia, t } from 'elysia';
import { authMiddleware } from '@/modules/auth/auth.module';
import { AdminUser } from '@/modules/admin/domain/admin-user.entity';
import type { GetRegistrationInviteStatusUseCase } from '../application/get-registration-invite-status.use-case';
import type { RegenerateRegistrationInviteUseCase } from '../application/regenerate-registration-invite.use-case';
import type { DeleteRegistrationInviteUseCase } from '../application/delete-registration-invite.use-case';
import type { ValidateRegistrationInviteUseCase } from '../application/validate-registration-invite.use-case';

export interface RegistrationInviteRouteUseCases {
  getStatus: GetRegistrationInviteStatusUseCase;
  regenerate: RegenerateRegistrationInviteUseCase;
  deleteInvite: DeleteRegistrationInviteUseCase;
  validate: ValidateRegistrationInviteUseCase;
}

const adminDetail = {
  tags: ['Admin'] as string[],
  security: [{ bearerAuth: [] as string[] }],
};

export function registrationInviteRoutes(useCases: RegistrationInviteRouteUseCases) {
  return new Elysia()
    .group('/api/admin/registration-invite', (group) =>
      group
        .use(authMiddleware)
        .get(
          '/',
          async ({ getAuthUser }) => {
            AdminUser.assertAdmin(await getAuthUser());
            const status = await useCases.getStatus.execute();
            return { success: true, ...status };
          },
          { detail: { ...adminDetail, summary: 'Registration invite status' } }
        )
        .post(
          '/regenerate',
          async ({ getAuthUser, request }) => {
            const admin = await getAuthUser();
            AdminUser.assertAdmin(admin);
            const result = await useCases.regenerate.execute(
              admin.Id,
              request.headers.get('x-forwarded-for')
            );
            return { success: true, ...result };
          },
          { detail: { ...adminDetail, summary: 'Generate registration invite' } }
        )
        .delete(
          '/:id',
          async ({ getAuthUser, params: { id }, request }) => {
            const admin = await getAuthUser();
            AdminUser.assertAdmin(admin);
            await useCases.deleteInvite.execute(
              admin.Id,
              id,
              request.headers.get('x-forwarded-for')
            );
            return { success: true };
          },
          {
            detail: { ...adminDetail, summary: 'Delete registration invite' },
            params: t.Object({
              id: t.String({ format: 'uuid' }),
            }),
          }
        )
    )
    .group('/api/auth', (group) =>
      group
        .get(
          '/registration-invite/:token',
          async ({ params: { token } }) => {
            const result = await useCases.validate.execute(token);
            return { success: true, ...result };
          },
          {
            detail: {
              tags: ['Authentication'],
              summary: 'Validate registration invite token',
            },
            params: t.Object({
              token: t.String({ minLength: 1 }),
            }),
          }
        )
    );
}
