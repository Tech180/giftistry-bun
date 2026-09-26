import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { WishlistRepository } from '../domain/ports/wishlist.repository';
import type { ListShareRepository } from '../domain/ports/list-share.repository';
import type { UserRepository } from '@/modules/auth';
import type { FriendRepository } from '@/modules/friends';
import type { ItemRepository } from '@/modules/item';
import type { ItemAudienceRepository } from '@/modules/item';
import type { CommentRepository } from '@/modules/comment';
import type { BackgroundJobRepository } from '@/modules/jobs';
import type {
  AssertCanCreateWishlistUseCase,
  AssertUserCanUseCase,
} from '@/common/application/use-cases/user-policy.use-cases';
import type { EventBus } from '@/common/domain/ports/event-bus.port';
import type { ServerConfigRepository } from '@/modules/system';
import type { ListChangedPublisher } from '../domain/ports/list-changed-publisher.port';
import type { ThemeResolver } from '../application/ports/theme-resolver.port';
import type { PdfGenerator } from '../application/ports/pdf-generator.port';
import type { ListReviewBackfillPort, ListItemsPort } from '@/modules/item';
import type { InvitesUseCases } from '@/modules/invites';

export interface WishlistModuleDeps {
  wishlistRepo: WishlistRepository;
  listShareRepo: ListShareRepository;
  userRepo: UserRepository;
  friendRepo: FriendRepository;
  itemRepo: ItemRepository;
  commentRepo: CommentRepository;
  itemAudienceRepo: ItemAudienceRepository;
  jobRepo?: BackgroundJobRepository;
  assertCanCreateWishlistUseCase: AssertCanCreateWishlistUseCase;
  assertUserCanUseCase: AssertUserCanUseCase;
  eventBus: EventBus;
  invitesUseCases: InvitesUseCases | undefined;
  serverConfigRepo: ServerConfigRepository;
  middleware: RouteMiddleware;
  listChanged: ListChangedPublisher;
  themeResolver: ThemeResolver;
  pdfGenerator: PdfGenerator;
  listItems: ListItemsPort;
  backfillListReviews: ListReviewBackfillPort;
}
