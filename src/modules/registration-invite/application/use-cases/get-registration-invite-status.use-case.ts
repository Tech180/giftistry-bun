import type { RegistrationInviteStatus } from '../interfaces/registration-invite-status.interface';
import { isRegistrationInviteFullyUsed } from '../../domain/utils/is-registration-invite-fully-used.util';
import { isRegistrationInviteUsable } from '../../domain/utils/is-registration-invite-usable.util';
import { resolveRegistrationInviteStatus } from '../../domain/utils/resolve-registration-invite-status.util';
import { buildRegistrationInviteUrl } from '../utils/build-registration-invite-url.util';
import type { RegistrationInviteRepository } from '../../domain/ports/registration-invite.repository';

export class GetRegistrationInviteStatusUseCase {
  constructor(private inviteRepo: RegistrationInviteRepository) {}

  async execute(): Promise<RegistrationInviteStatus> {
    const invites = await this.inviteRepo.findAll();
    const now = new Date();
    const list = invites.map((invite) => ({
      Id: invite.Id,
      Url: buildRegistrationInviteUrl(invite.Token),
      Status: resolveRegistrationInviteStatus(invite, now),
      ExpiresAt: invite.ExpiresAt.toISOString(),
      MaxUses: invite.MaxUses,
      UseCount: invite.UseCount,
      CreatedAt: invite.CreatedAt.toISOString(),
    }));

    const active = invites.find((invite) => isRegistrationInviteUsable(invite, now)) ?? null;
    if (!active) {
      const latest = invites[0] ?? null;
      return {
        HasActiveInvite: false,
        IsExpired: latest ? latest.ExpiresAt.getTime() <= now.getTime() : false,
        IsCompleted: latest != null && isRegistrationInviteFullyUsed(latest),
        ExpiresAt: latest?.ExpiresAt.toISOString() ?? null,
        MaxUses: latest?.MaxUses ?? null,
        UseCount: latest?.UseCount ?? 0,
        CreatedAt: latest?.CreatedAt.toISOString() ?? null,
        Invites: list,
      };
    }

    return {
      HasActiveInvite: true,
      IsExpired: false,
      IsCompleted: false,
      ExpiresAt: active.ExpiresAt.toISOString(),
      MaxUses: active.MaxUses,
      UseCount: active.UseCount,
      CreatedAt: active.CreatedAt.toISOString(),
      Invites: list,
    };
  }
}
