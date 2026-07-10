import { PostgresUserRepository } from '@/modules/auth/infrastructure/postgres-user.repository';
import { PostgresPasskeyRepository } from '@/modules/auth/infrastructure/postgres-passkey.repository';
import { SmtpEmailAdapter } from '@/modules/auth/infrastructure/smtp-email.adapter';
import { PostgresSitePolicyRepository } from '@/common/infrastructure/postgres-site-policy.repository';
import { PostgresAuditLogRepository } from '@/common/infrastructure/postgres-audit-log.repository';
import { PostgresUserPolicyRepository } from '@/common/infrastructure/postgres-user-policy.repository';
import { PostgresWishlistRepository } from '@/modules/wishlist/infrastructure/postgres-wishlist.repository';
import { PostgresListShareRepository } from '@/modules/wishlist/infrastructure/postgres-list-share.repository';
import { PostgresItemRepository } from '@/modules/item/infrastructure/postgres-item.repository';
import { PostgresItemAudienceRepository } from '@/modules/item/infrastructure/postgres-item-audience.repository';
import { PostgresItemFieldRepository } from '@/modules/item/infrastructure/postgres-item-field.repository';
import { PostgresCommentRepository } from '@/modules/comment/infrastructure/postgres-comment.repository';
import { PostgresFriendRepository } from '@/modules/friends/infrastructure/postgres-friend.repository';
import { PostgresFriendRequestRepository } from '@/modules/friends/infrastructure/postgres-friend-request.repository';
import { PostgresNotificationRepository } from '@/modules/notifications/infrastructure/postgres-notification.repository';
import { PostgresListLinkTokenRepository } from '@/modules/invites/infrastructure/postgres-list-link-token.repository';
import { PostgresListEmailInviteRepository } from '@/modules/invites/infrastructure/postgres-list-email-invite.repository';
import { PostgresAdminUserRepository } from '@/modules/admin/infrastructure/postgres-admin-user.repository';
import { PostgresModerationRepository } from '@/modules/admin/infrastructure/postgres-moderation.repository';
import { PostgresReportRepository } from '@/modules/admin/infrastructure/postgres-report.repository';
import { PostgresServerConfigRepository } from '@/modules/system/infrastructure/postgres-server-config.repository';
import { GetSitePolicyUseCase } from '@/common/application/get-site-policy.use-case';
import { SaveSitePolicyUseCase } from '@/common/application/save-site-policy.use-case';
import { AssertUserCanUseCase, AssertCanCreateWishlistUseCase } from '@/common/application/user-policy.use-cases';
import { WriteAuditLogUseCase } from '@/common/application/write-audit-log.use-case';
import { InProcessEventBus } from '@/common/infrastructure/in-process-event-bus';
import { CreateNotificationUseCase } from '@/modules/notifications/application/create-notification.use-case';
import { registerCreateNotificationHandlers } from '@/modules/notifications/infrastructure/event-handlers/create-notification.handler';
import { CheerioPlaywrightMetadataScraper } from '@/modules/item/infrastructure/cheerio-playwright-metadata-scraper';
import { createAuthModule, authMiddleware } from '@/modules/auth/auth.module';
import type { createAuthMiddleware } from '@/modules/auth/presentation/auth.routes';
import { createWishlistModule, createCheckListAccessUseCase } from '@/modules/wishlist/wishlist.module';
import { createItemModule } from '@/modules/item/item.module';
import { createCommentModule } from '@/modules/comment/comment.module';
import { createFriendsModule } from '@/modules/friends/friends.module';
import { createInvitesModule } from '@/modules/invites/invites.module';
import { createNotificationsModule } from '@/modules/notifications/notifications.module';
import { createAdminModule } from '@/modules/admin/admin.module';
import { createSystemModule } from '@/modules/system/system.module';
import { createListAccessMiddleware } from '@/common/middlewares/list-access.middleware';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { RouteMiddleware } from '@/common/types/route-middleware';

export interface AppContainer {
  authModule: ReturnType<typeof createAuthModule>;
  wishlistModule: ReturnType<typeof createWishlistModule>['module'];
  itemModule: ReturnType<typeof createItemModule>;
  commentModule: ReturnType<typeof createCommentModule>;
  friendsModule: ReturnType<typeof createFriendsModule>;
  notificationsModule: ReturnType<typeof createNotificationsModule>;
  invitesModule: ReturnType<typeof createInvitesModule>['module'];
  systemModule: ReturnType<typeof createSystemModule>['module'];
  adminModule: ReturnType<typeof createAdminModule>;
  authMiddleware: ReturnType<typeof createAuthMiddleware>;
  userRepo: UserRepository;
}

export function createAppContainer(): AppContainer {
  const userRepo = new PostgresUserRepository();
  const passkeyRepo = new PostgresPasskeyRepository();
  const emailSender = new SmtpEmailAdapter();
  const sitePolicyRepo = new PostgresSitePolicyRepository();
  const auditLogRepo = new PostgresAuditLogRepository();
  const userPolicyRepo = new PostgresUserPolicyRepository();
  const wishlistRepo = new PostgresWishlistRepository();
  const listShareRepo = new PostgresListShareRepository();
  const itemRepo = new PostgresItemRepository();
  const itemAudienceRepo = new PostgresItemAudienceRepository();
  const itemFieldRepo = new PostgresItemFieldRepository();
  const commentRepo = new PostgresCommentRepository();
  const friendRepo = new PostgresFriendRepository();
  const friendRequestRepo = new PostgresFriendRequestRepository();
  const notificationRepo = new PostgresNotificationRepository();
  const linkTokenRepo = new PostgresListLinkTokenRepository();
  const emailInviteRepo = new PostgresListEmailInviteRepository();
  const adminUserRepo = new PostgresAdminUserRepository();
  const moderationRepo = new PostgresModerationRepository();
  const reportRepo = new PostgresReportRepository();
  const serverConfigRepo = new PostgresServerConfigRepository();
  const metadataScraper = new CheerioPlaywrightMetadataScraper();

  const getSitePolicyUseCase = new GetSitePolicyUseCase(sitePolicyRepo);
  const saveSitePolicyUseCase = new SaveSitePolicyUseCase(sitePolicyRepo);
  const writeAuditLogUseCase = new WriteAuditLogUseCase(auditLogRepo);
  const assertUserCanUseCase = new AssertUserCanUseCase(userPolicyRepo);
  const assertCanCreateWishlistUseCase = new AssertCanCreateWishlistUseCase(userPolicyRepo);

  const eventBus = new InProcessEventBus();
  const createNotificationUseCase = new CreateNotificationUseCase(notificationRepo);
  registerCreateNotificationHandlers(eventBus, createNotificationUseCase);

  const authModule = createAuthModule({
    userRepo,
    passkeyRepo,
    emailSender,
    getSitePolicyUseCase,
    writeAuditLogUseCase,
    assertUserCanUseCase,
    wishlistRepo,
  });

  const checkListAccessUseCase = createCheckListAccessUseCase(listShareRepo);
  const listAccessMiddleware = createListAccessMiddleware(checkListAccessUseCase, authMiddleware);
  const routeMiddleware: RouteMiddleware = { auth: authMiddleware, listAccess: listAccessMiddleware };

  const { module: invitesModule, invitesUseCases } = createInvitesModule({
    linkTokenRepo,
    emailInviteRepo,
    listShareRepo,
    userRepo,
    wishlistRepo,
    assertUserCanUseCase,
    eventBus,
  });

  const { module: wishlistModule } = createWishlistModule({
    wishlistRepo,
    listShareRepo,
    userRepo,
    friendRepo,
    itemRepo,
    commentRepo,
    itemAudienceRepo,
    assertCanCreateWishlistUseCase,
    assertUserCanUseCase,
    eventBus,
    invitesUseCases,
    middleware: routeMiddleware,
  });

  const itemModule = createItemModule({
    itemRepo,
    audienceRepo: itemAudienceRepo,
    fieldRepo: itemFieldRepo,
    wishlistRepo,
    listShareRepo,
    metadataScraper,
    middleware: routeMiddleware,
  });

  const commentModule = createCommentModule({
    commentRepo,
    wishlistRepo,
    assertUserCanUseCase,
    middleware: routeMiddleware,
  });

  const friendsModule = createFriendsModule({
    friendRepo,
    friendRequestRepo,
    userRepo,
    assertUserCanUseCase,
    eventBus,
  });

  const notificationsModule = createNotificationsModule({
    notificationRepo,
  });

  const { module: systemModule } = createSystemModule({
    serverConfigRepo,
    getSitePolicyUseCase,
    writeAuditLogUseCase,
  });

  const adminModule = createAdminModule({
    adminUserRepo,
    moderationRepo,
    reportRepo,
    auditLogRepo,
    getSitePolicyUseCase,
    saveSitePolicyUseCase,
    writeAuditLogUseCase,
  });

  return {
    authModule,
    wishlistModule,
    itemModule,
    commentModule,
    friendsModule,
    notificationsModule,
    invitesModule,
    systemModule,
    adminModule,
    authMiddleware,
    userRepo,
  };
}
