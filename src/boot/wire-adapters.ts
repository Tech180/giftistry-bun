/**
 * Composition-root adapter construction.
 * Module factories must not call `new` on these — inject via deps instead.
 */
import { PostgresUserRepository } from '@/modules/auth/infrastructure/repositories/postgres-user.repository';
import { PostgresPasskeyRepository } from '@/modules/auth/infrastructure/repositories/postgres-passkey.repository';
import { SmtpEmailAdapter } from '@/modules/auth/infrastructure/adapters/smtp-email.adapter';
import { OpenIdClientAdapter } from '@/modules/auth/infrastructure/adapters/openid-client.adapter';
import { PostgresSitePolicyRepository } from '@/common/infrastructure/repositories/postgres-site-policy.repository';
import { PostgresAuditLogRepository } from '@/common/infrastructure/repositories/postgres-audit-log.repository';
import { PostgresUserPolicyRepository } from '@/common/infrastructure/repositories/postgres-user-policy.repository';
import { PostgresWishlistRepository } from '@/modules/wishlist/infrastructure/repositories/postgres-wishlist.repository';
import { PostgresListShareRepository } from '@/modules/wishlist/infrastructure/repositories/postgres-list-share.repository';
import { PostgresListAccessRepository } from '@/modules/wishlist/infrastructure/repositories/postgres-list-access.repository';
import { PostgresThemeResolver } from '@/modules/wishlist/infrastructure/adapters/postgres-theme-resolver';
import { PdfLibGenerator } from '@/modules/wishlist/infrastructure/adapters/pdf-lib-generator';
import { WishlistWsPresenceAdapter } from '@/modules/wishlist/infrastructure/adapters/wishlist-ws-presence.adapter';
import { WebsocketListChangedPublisher } from '@/modules/wishlist/infrastructure/adapters/websocket-list-changed-publisher';
import { getWishlistWsRoom } from '@/modules/wishlist/infrastructure/stores/wishlist-ws.store';
import { PostgresItemRepository } from '@/modules/item/infrastructure/repositories/postgres-item.repository';
import { PostgresItemAudienceRepository } from '@/modules/item/infrastructure/repositories/postgres-item-audience.repository';
import { PostgresItemFieldRepository } from '@/modules/item/infrastructure/repositories/postgres-item-field.repository';
import { PostgresItemReviewRepository } from '@/modules/item/infrastructure/repositories/postgres-item-review.repository';
import { MetadataScraperOrchestrator } from '@/modules/item/infrastructure/adapters/metadata-scraper.orchestrator';
import { AiReviewExtractor } from '@/modules/item/infrastructure/adapters/ai-review-extractor';
import { AiMetadataPopulator } from '@/modules/item/infrastructure/adapters/ai-metadata-populator';
import { AiCategoryClassifier } from '@/modules/item/infrastructure/adapters/ai-category-classifier';
import { AiDescriptionSummarizer } from '@/modules/item/infrastructure/adapters/ai-description-summarizer';
import { AiItemImportParser } from '@/modules/item/infrastructure/adapters/ai-item-import-parser';
import { DefaultImportFileTextExtractor } from '@/modules/item/infrastructure/adapters/import-file-text-extractor';
import { HttpPageContextFetcher } from '@/modules/item/infrastructure/adapters/http-page-context-fetcher';
import { PlaywrightProductResearcher } from '@/modules/item/infrastructure/adapters/playwright-product-researcher';
import { FetchRemoteImageAsDataUrl } from '@/modules/item/infrastructure/adapters/fetch-remote-image-as-data-url';
import { PostgresCommentRepository } from '@/modules/comment/infrastructure/repositories/postgres-comment.repository';
import { WebsocketCommentRealtimePublisher } from '@/modules/comment/infrastructure/adapters/websocket-comment-realtime-publisher';
import { PostgresFriendRepository } from '@/modules/friends/infrastructure/repositories/postgres-friend.repository';
import { PostgresFriendRequestRepository } from '@/modules/friends/infrastructure/repositories/postgres-friend-request.repository';
import { PostgresNotificationRepository } from '@/modules/notifications/infrastructure/repositories/postgres-notification.repository';
import { PostgresPushSubscriptionRepository } from '@/modules/notifications/infrastructure/repositories/postgres-push-subscription.repository';
import { NtfyPushAdapter } from '@/modules/notifications/infrastructure/adapters/ntfy-push.adapter';
import { WebPushAdapter } from '@/modules/notifications/infrastructure/adapters/webpush-push.adapter';
import { FcmPushAdapter } from '@/modules/notifications/infrastructure/adapters/fcm-push.adapter';
import { WebsocketNotificationRealtimePublisher } from '@/modules/notifications/infrastructure/adapters/websocket-notification-realtime-publisher';
import { PostgresListLinkTokenRepository } from '@/modules/invites/infrastructure/repositories/postgres-list-link-token.repository';
import { PostgresListEmailInviteRepository } from '@/modules/invites/infrastructure/repositories/postgres-list-email-invite.repository';
import { InviteGuestRealtimeAdapter } from '@/modules/invites/infrastructure/adapters/invite-guest-realtime.adapter';
import { PostgresAdminUserRepository } from '@/modules/admin/infrastructure/repositories/postgres-admin-user.repository';
import { PostgresModerationRepository } from '@/modules/admin/infrastructure/repositories/postgres-moderation.repository';
import { PostgresReportRepository } from '@/modules/admin/infrastructure/repositories/postgres-report.repository';
import { PostgresServerConfigRepository } from '@/modules/system/infrastructure/repositories/postgres-server-config.repository';
import { PostgresRegistrationInviteRepository } from '@/modules/registration-invite/infrastructure/repositories/postgres-registration-invite.repository';
import { PostgresBackgroundJobRepository } from '@/modules/jobs/infrastructure/repositories/postgres-background-job.repository';
import { WebsocketJobProgressPublisher } from '@/modules/jobs/infrastructure/adapters/websocket-job-progress-publisher';
import { InProcessEventBus } from '@/common/infrastructure/in-process-event-bus';

export function createInfrastructureAdapters() {
  const userRepo = new PostgresUserRepository();
  const passkeyRepo = new PostgresPasskeyRepository();
  const emailSender = new SmtpEmailAdapter();
  const sitePolicyRepo = new PostgresSitePolicyRepository();
  const auditLogRepo = new PostgresAuditLogRepository();
  const userPolicyRepo = new PostgresUserPolicyRepository();
  const wishlistRepo = new PostgresWishlistRepository();
  const listShareRepo = new PostgresListShareRepository();
  const listAccessRepo = new PostgresListAccessRepository();
  const themeResolver = new PostgresThemeResolver();
  const pdfGenerator = new PdfLibGenerator();
  const wishlistPresence = new WishlistWsPresenceAdapter();
  const listChanged = new WebsocketListChangedPublisher();
  const itemRepo = new PostgresItemRepository();
  const itemAudienceRepo = new PostgresItemAudienceRepository();
  const itemFieldRepo = new PostgresItemFieldRepository();
  const itemReviewRepo = new PostgresItemReviewRepository();
  const metadataScraper = new MetadataScraperOrchestrator();
  const reviewExtractor = new AiReviewExtractor();
  const metadataPopulator = new AiMetadataPopulator();
  const categoryClassifier = new AiCategoryClassifier();
  const descriptionSummarizer = new AiDescriptionSummarizer();
  const itemImportParser = new AiItemImportParser();
  const importFileTextExtractor = new DefaultImportFileTextExtractor();
  const pageContextFetcher = new HttpPageContextFetcher();
  const productResearcher = new PlaywrightProductResearcher();
  const remoteImageFetcher = new FetchRemoteImageAsDataUrl();
  const commentRepo = new PostgresCommentRepository();
  const commentRealtime = new WebsocketCommentRealtimePublisher(
    getWishlistWsRoom,
    (listId) => wishlistRepo.findById(listId)
  );
  const friendRepo = new PostgresFriendRepository();
  const friendRequestRepo = new PostgresFriendRequestRepository();
  const notificationRepo = new PostgresNotificationRepository();
  const pushSubscriptionRepo = new PostgresPushSubscriptionRepository();
  const serverConfigRepo = new PostgresServerConfigRepository();
  const oidcClient = new OpenIdClientAdapter(serverConfigRepo);
  const ntfyPushAdapter = new NtfyPushAdapter(serverConfigRepo);
  const webPushAdapter = new WebPushAdapter(serverConfigRepo);
  const fcmPushAdapter = new FcmPushAdapter(serverConfigRepo);
  const notificationRealtime = new WebsocketNotificationRealtimePublisher();
  const linkTokenRepo = new PostgresListLinkTokenRepository();
  const emailInviteRepo = new PostgresListEmailInviteRepository();
  const inviteGuestRealtime = new InviteGuestRealtimeAdapter();
  const adminUserRepo = new PostgresAdminUserRepository();
  const moderationRepo = new PostgresModerationRepository();
  const reportRepo = new PostgresReportRepository();
  const registrationInviteRepo = new PostgresRegistrationInviteRepository();
  const jobRepo = new PostgresBackgroundJobRepository();
  const jobProgressPublisher = new WebsocketJobProgressPublisher();
  const eventBus = new InProcessEventBus();

  return {
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
  };
}
