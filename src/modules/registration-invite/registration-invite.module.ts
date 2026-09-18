import { Elysia } from 'elysia';
import type { RegistrationInviteRepository } from './domain/ports/registration-invite.repository';
import type { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import type { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { GetRegistrationInviteStatusUseCase } from './application/get-registration-invite-status.use-case';
import { RegenerateRegistrationInviteUseCase } from './application/regenerate-registration-invite.use-case';
import { DeleteRegistrationInviteUseCase } from './application/delete-registration-invite.use-case';
import { ValidateRegistrationInviteUseCase } from './application/validate-registration-invite.use-case';
import { registrationInviteRoutes } from './presentation/registration-invite.routes';

export interface RegistrationInviteModuleDeps {
  inviteRepo: RegistrationInviteRepository;
  getSitePolicyUseCase: GetSitePolicyUseCase;
  writeAuditLogUseCase: WriteAuditLogUseCase;
}

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

  return {
    module: new Elysia().use(
      registrationInviteRoutes({
        getStatus,
        regenerate,
        deleteInvite,
        validate,
      })
    ),
    inviteRepo: deps.inviteRepo,
    useCases: { getStatus, regenerate, deleteInvite, validate },
  };
}
