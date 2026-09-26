import { Elysia } from 'elysia';
import { createAdminAuthMiddleware } from '@/modules/admin';
import { DeleteRegistrationInviteUseCase } from './application/use-cases/delete-registration-invite.use-case';
import { GetRegistrationInviteStatusUseCase } from './application/use-cases/get-registration-invite-status.use-case';
import { RegenerateRegistrationInviteUseCase } from './application/use-cases/regenerate-registration-invite.use-case';
import { ValidateRegistrationInviteUseCase } from './application/use-cases/validate-registration-invite.use-case';
import type { RegistrationInviteModuleDeps } from './interfaces/registration-invite-module-deps.interface';
import { registrationInviteRoutes } from './presentation/registration-invite.routes';

export function createRegistrationInviteModule(deps: RegistrationInviteModuleDeps) {
  const getStatus = new GetRegistrationInviteStatusUseCase(deps.inviteRepo);
  const regenerate = new RegenerateRegistrationInviteUseCase(
    deps.inviteRepo,
    deps.getSitePolicyUseCase,
    deps.writeAuditLogUseCase
  );
  const deleteInvite = new DeleteRegistrationInviteUseCase(
    deps.inviteRepo,
    deps.writeAuditLogUseCase
  );
  const validate = new ValidateRegistrationInviteUseCase(
    deps.inviteRepo,
    deps.getSitePolicyUseCase
  );
  const adminAuth = createAdminAuthMiddleware(deps.authMiddleware);

  return {
    module: new Elysia().use(
      registrationInviteRoutes({
        useCases: { getStatus, regenerate, deleteInvite, validate },
        adminAuth,
      })
    ),
    inviteRepo: deps.inviteRepo,
    useCases: { getStatus, regenerate, deleteInvite, validate },
  };
}
