import type { DeleteRegistrationInviteUseCase } from '../../application/use-cases/delete-registration-invite.use-case';
import type { GetRegistrationInviteStatusUseCase } from '../../application/use-cases/get-registration-invite-status.use-case';
import type { RegenerateRegistrationInviteUseCase } from '../../application/use-cases/regenerate-registration-invite.use-case';
import type { ValidateRegistrationInviteUseCase } from '../../application/use-cases/validate-registration-invite.use-case';

export interface UseCases {
  getStatus: GetRegistrationInviteStatusUseCase;
  regenerate: RegenerateRegistrationInviteUseCase;
  deleteInvite: DeleteRegistrationInviteUseCase;
  validate: ValidateRegistrationInviteUseCase;
}
