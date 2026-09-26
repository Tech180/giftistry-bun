import type { createAuthMiddleware } from '@/modules/auth/presentation/middlewares/auth.middleware';
import type { createAuthModule } from '@/modules/auth/auth.module';
import type { createAdminModule } from '@/modules/admin/admin.module';
import type { createCommentModule } from '@/modules/comment/comment.module';
import type { createFriendsModule } from '@/modules/friends/friends.module';
import type { createInvitesModule } from '@/modules/invites/invites.module';
import type { createItemModule } from '@/modules/item/item.module';
import type { createJobsModule } from '@/modules/jobs/jobs.module';
import type { createNotificationsModule } from '@/modules/notifications/notifications.module';
import type { createRegistrationInviteModule } from '@/modules/registration-invite/registration-invite.module';
import type { createSystemModule } from '@/modules/system/system.module';
import type { createWishlistModule } from '@/modules/wishlist/wishlist.module';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { ListLinkTokenRepository } from '@/modules/invites';
import type {
  BackgroundJobRunner,
  NotifyItemJobCompletionUseCase,
} from '@/modules/jobs';
import type { BackgroundJobRepository } from '@/modules/jobs/domain/ports/background-job.repository';
import type { RealtimePublisherAdapters } from '@/boot/interfaces/realtime-publisher-adapters.interface';

export interface AppContainer {
  authModule: ReturnType<typeof createAuthModule>;
  wishlistModule: ReturnType<typeof createWishlistModule>['module'];
  itemModule: ReturnType<typeof createItemModule>['module'];
  jobsModule: ReturnType<typeof createJobsModule>['module'];
  jobRunner: BackgroundJobRunner;
  jobRepo: BackgroundJobRepository;
  notifyItemJobCompletion: NotifyItemJobCompletionUseCase;
  commentModule: ReturnType<typeof createCommentModule>;
  friendsModule: ReturnType<typeof createFriendsModule>;
  notificationsModule: ReturnType<typeof createNotificationsModule>;
  invitesModule: ReturnType<typeof createInvitesModule>['module'];
  registrationInviteModule: ReturnType<typeof createRegistrationInviteModule>['module'];
  systemModule: ReturnType<typeof createSystemModule>['module'];
  adminModule: ReturnType<typeof createAdminModule>;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  userRepo: UserRepository;
  linkTokenRepo: ListLinkTokenRepository;
  realtimePublishers: RealtimePublisherAdapters;
}
