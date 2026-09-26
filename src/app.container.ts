import { createInfrastructureAdapters } from '@/boot/wire-adapters';
import type { AppContainer } from '@/boot/interfaces/app-container.interface';
import type { CreateAppContainerOptions } from '@/boot/interfaces/create-app-container-options.interface';
import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { RealtimePublisherAdapters } from '@/boot/interfaces/realtime-publisher-adapters.interface';
import { GetSitePolicyUseCase } from '@/common/application/use-cases/get-site-policy.use-case';
import { SaveSitePolicyUseCase } from '@/common/application/use-cases/save-site-policy.use-case';
import { AssertUserCanUseCase, AssertCanCreateWishlistUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import { WriteAuditLogUseCase } from '@/common/application/use-cases/write-audit-log.use-case';
import { DeliverPushNotificationUseCase } from '@/modules/notifications/application/use-cases/deliver-push-notification.use-case';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case';
import { registerCreateNotificationHandlers } from '@/modules/notifications/infrastructure/event-handlers/create-notification.handler';
import { isUserForegroundConnected } from '@/modules/notifications/infrastructure/stores/user-ws.store';
import { createAuthModule, authMiddleware } from '@/modules/auth/auth.module';
import { createWishlistModule, createCheckListAccessUseCase } from '@/modules/wishlist/wishlist.module';
import { createItemModule } from '@/modules/item/item.module';
import { createCommentModule } from '@/modules/comment/comment.module';
import { createFriendsModule } from '@/modules/friends/friends.module';
import { createInvitesModule } from '@/modules/invites/invites.module';
import { createNotificationsModule } from '@/modules/notifications/notifications.module';
import { createAdminModule } from '@/modules/admin/admin.module';
import { createSystemModule } from '@/modules/system/system.module';
import { createRegistrationInviteModule } from '@/modules/registration-invite/registration-invite.module';
import {
  SaveSystemSettingsUseCase,
  TestAiConnectionUseCase,
} from '@/modules/system';
import { createJobsModule } from '@/modules/jobs/jobs.module';
import { NotifyItemJobCompletionUseCase } from '@/modules/jobs';
import { createListAccessMiddleware } from '@/common/middlewares/list-access.middleware';
import { setPublicAppUrlConfigSource } from '@/common/utils/public-app-url.util';

export function createAppContainer(options: CreateAppContainerOptions = {}): AppContainer {
  const adapters = createInfrastructureAdapters();
  const {
    userRepo,
    passkeyRepo,
    emailSender,
    sitePolicyRepo,
    auditLogRepo,
    userPolicyRepo,
    wishlistRepo,
    listShareRepo,
    listAccessRepo,
    themeResolver,
    pdfGenerator,
    wishlistPresence,
    listChanged,
    itemRepo,
    itemAudienceRepo,
    itemFieldRepo,
    itemReviewRepo,
    metadataScraper,
    reviewExtractor,
    metadataPopulator,
    categoryClassifier,
    descriptionSummarizer,
    itemImportParser,
    importFileTextExtractor,
    pageContextFetcher,
    productResearcher,
    remoteImageFetcher,
    commentRepo,
    commentRealtime,
    friendRepo,
    friendRequestRepo,
    notificationRepo,
    pushSubscriptionRepo,
    serverConfigRepo,
    oidcClient,
    ntfyPushAdapter,
    webPushAdapter,
    fcmPushAdapter,
    notificationRealtime,
    linkTokenRepo,
    emailInviteRepo,
    inviteGuestRealtime,
    adminUserRepo,
    moderationRepo,
    reportRepo,
    registrationInviteRepo,
    jobRepo,
    jobProgressPublisher,
    eventBus,
  } = adapters;

  setPublicAppUrlConfigSource(() => serverConfigRepo.load().PublicAppUrl);

  const getSitePolicyUseCase = new GetSitePolicyUseCase(sitePolicyRepo);
  const saveSitePolicyUseCase = new SaveSitePolicyUseCase(sitePolicyRepo);
  const writeAuditLogUseCase = new WriteAuditLogUseCase(auditLogRepo);
  const assertUserCanUseCase = new AssertUserCanUseCase(userPolicyRepo);
  const assertCanCreateWishlistUseCase = new AssertCanCreateWishlistUseCase(userPolicyRepo);

  const deliverPushNotification = new DeliverPushNotificationUseCase(
    pushSubscriptionRepo,
    {
      ntfy: ntfyPushAdapter,
      webpush: webPushAdapter,
      fcm: fcmPushAdapter,
    },
    serverConfigRepo,
    { isUserForegroundConnected }
  );

  const realtimePublishers: RealtimePublisherAdapters = {
    jobProgress: jobProgressPublisher,
    listChanged,
    notification: notificationRealtime,
  };
  const createNotificationUseCase = new CreateNotificationUseCase(
    notificationRepo,
    notificationRealtime,
    deliverPushNotification
  );
  registerCreateNotificationHandlers(eventBus, createNotificationUseCase);
  const notifyItemJobCompletion = new NotifyItemJobCompletionUseCase(
    createNotificationUseCase,
    wishlistRepo,
    wishlistPresence
  );

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
    registrationInviteRepo,
    oidcClient,
  });

  const { module: registrationInviteModule } = createRegistrationInviteModule({
    inviteRepo: registrationInviteRepo,
    getSitePolicyUseCase,
    writeAuditLogUseCase,
    authMiddleware,
  });

  const checkListAccessUseCase = createCheckListAccessUseCase(listShareRepo, listAccessRepo);
  const listAccessMiddleware = createListAccessMiddleware(checkListAccessUseCase, authMiddleware);
  const routeMiddleware: RouteMiddleware = { auth: authMiddleware, listAccess: listAccessMiddleware };

  const {
    module: itemModule,
    useCases: itemUseCases,
    backfillListReviews,
  } = createItemModule({
    itemRepo,
    audienceRepo: itemAudienceRepo,
    fieldRepo: itemFieldRepo,
    itemReviewRepo,
    reviewExtractor,
    metadataPopulator,
    categoryClassifier,
    descriptionSummarizer,
    itemImportParser,
    importFileTextExtractor,
    pageContextFetcher,
    productResearcher,
    remoteImageFetcher,
    wishlistRepo,
    listShareRepo,
    userRepo,
    assertUserCanUseCase,
    metadataScraper,
    serverConfigRepo,
    middleware: routeMiddleware,
    createNotification: createNotificationUseCase,
    commentRepo,
    commentRealtime,
    listChanged,
    eventBus,
  });

  const { module: invitesModule, invitesUseCases } = createInvitesModule({
    linkTokenRepo,
    emailInviteRepo,
    listShareRepo,
    userRepo,
    wishlistRepo,
    assertUserCanUseCase,
    eventBus,
    listItems: itemUseCases.listItems,
    guestRealtime: inviteGuestRealtime,
  });

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
    listChanged,
    themeResolver,
    pdfGenerator,
    listItems: itemUseCases.listItems,
    backfillListReviews,
  });

  const { module: jobsModule, runner: jobRunner } = createJobsModule({
    itemJobs: itemUseCases,
    createWishlist: wishlistUseCases.createWishlist,
    middleware: routeMiddleware,
    jobRepo,
    jobProgressPublisher,
    serverConfigRepo,
    notifyItemJobCompletion: options.skipItemJobCompletionNotify
      ? undefined
      : notifyItemJobCompletion,
  });

  const commentModule = createCommentModule({
    commentRepo,
    wishlistRepo,
    listShareRepo,
    assertUserCanUseCase,
    commentRealtime,
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
    pushSubscriptionRepo,
    serverConfigRepo,
  });

  const { module: systemModule } = createSystemModule({
    serverConfigRepo,
    getSitePolicyUseCase,
    saveSitePolicyUseCase,
    writeAuditLogUseCase,
  });

  const adminModule = createAdminModule({
    userRepo: adminUserRepo,
    moderationRepo,
    reportRepo,
    auditLogRepo,
    getSitePolicyUseCase,
    saveSitePolicyUseCase,
    writeAuditLogUseCase,
    authMiddleware,
  });

  return {
    authModule,
    wishlistModule,
    itemModule,
    jobsModule,
    jobRunner,
    jobRepo,
    notifyItemJobCompletion,
    commentModule,
    friendsModule,
    notificationsModule,
    invitesModule,
    registrationInviteModule,
    systemModule,
    adminModule,
    authMiddleware,
    userRepo,
    linkTokenRepo,
    realtimePublishers,
  };
}
