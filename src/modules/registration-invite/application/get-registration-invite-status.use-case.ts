import type { RegistrationInviteRepository } from '../domain/ports/registration-invite.repository';
import {
  isRegistrationInviteFullyUsed,
  isRegistrationInviteUsable,
  resolveRegistrationInviteStatus,
  type RegistrationInviteStatus,
} from '../domain/registration-invite.entity';
import { buildRegistrationInviteUrl } from './build-registration-invite-url.util';

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
