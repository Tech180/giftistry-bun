import type { AnyElysia } from 'elysia';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { ListLinkTokenRepository } from '@/modules/invites';

export interface CreateHttpAppDeps {
  authModule: AnyElysia;
  notificationsModule: AnyElysia;
  wishlistModule: AnyElysia;
  itemModule: AnyElysia;
  jobsModule: AnyElysia;
  commentModule: AnyElysia;
  friendsModule: AnyElysia;
  invitesModule: AnyElysia;
  registrationInviteModule: AnyElysia;
  systemModule: AnyElysia;
  adminModule: AnyElysia;
  userRepo: UserRepository;
  linkTokenRepo: ListLinkTokenRepository;
}
