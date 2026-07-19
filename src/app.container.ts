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
import { SaveSystemSettingsUseCase } from '@/modules/system/application/save-system-settings.use-case';
import { TestAiConnectionUseCase } from '@/modules/system/application/test-ai-connection.use-case';
import { createJobsModule } from '@/modules/jobs/jobs.module';
import { PostgresBackgroundJobRepository } from '@/modules/jobs/infrastructure/postgres-background-job.repository';
import type { BackgroundJobRunner } from '@/modules/jobs/application/background-job-runner';
import { createListAccessMiddleware } from '@/common/middlewares/list-access.middleware';
import type { UserRepository } from '@/modules/auth/domain/ports/user.repository';
import type { RouteMiddleware } from '@/common/types/route-middleware';

export interface AppContainer {
  authModule: ReturnType<typeof createAuthModule>;
  wishlistModule: ReturnType<typeof createWishlistModule>['module'];
  itemModule: ReturnType<typeof createItemModule>['module'];
  jobsModule: ReturnType<typeof createJobsModule>['module'];
  jobRunner: BackgroundJobRunner;
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

  const testAiConnectionUseCase = new TestAiConnectionUseCase();
  const saveSystemSettingsUseCase = new SaveSystemSettingsUseCase(serverConfigRepo, testAiConnectionUseCase);

  const authModule = createAuthModule({
    userRepo,
    passkeyRepo,
    emailSender,
    getSitePolicyUseCase,
    saveSitePolicyUseCase,
    writeAuditLogUseCase,
    assertUserCanUseCase,
    wishlistRepo,
    serverConfigRepo,
    saveSystemSettingsUseCase,
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

  const jobRepo = new PostgresBackgroundJobRepository();

  const { module: wishlistModule, useCases: wishlistUseCases } = createWishlistModule({
    wishlistRepo,
    listShareRepo,
    userRepo,
    friendRepo,
    itemRepo,
    commentRepo,
    itemAudienceRepo,
    jobRepo,
    assertCanCreateWishlistUseCase,
    assertUserCanUseCase,
    eventBus,
    invitesUseCases,
    serverConfigRepo,
    middleware: routeMiddleware,
  });

  const { module: itemModule, useCases: itemUseCases } = createItemModule({
    itemRepo,
    audienceRepo: itemAudienceRepo,
    fieldRepo: itemFieldRepo,
    wishlistRepo,
    listShareRepo,
    userRepo,
    assertUserCanUseCase,
    metadataScraper,
    serverConfigRepo,
    middleware: routeMiddleware,
  });

  const { module: jobsModule, runner: jobRunner } = createJobsModule({
    itemUseCases,
    createWishlist: wishlistUseCases.createWishlist,
    middleware: routeMiddleware,
    jobRepo,
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
    saveSitePolicyUseCase,
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
    jobsModule,
    jobRunner,
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
