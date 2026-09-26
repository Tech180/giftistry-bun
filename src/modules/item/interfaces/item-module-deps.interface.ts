import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { EventBus } from '@/common/domain/ports/event-bus.port';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { UserRepository } from '@/modules/auth';
import type { CommentRepository, CommentRealtimePublisher } from '@/modules/comment';
import type { CreateNotificationUseCase } from '@/modules/notifications';
import type { ServerConfigRepository } from '@/modules/system';
import type {
  ListChangedPublisher,
  ListShareRepository,
  WishlistRepository,
} from '@/modules/wishlist';
import type { ItemAudienceRepository } from '../domain/ports/item-audience.repository';
import type { ItemFieldRepository } from '../domain/ports/item-field.repository';
import type { ItemRepository } from '../domain/ports/item.repository';
import type { ItemReviewRepository } from '../domain/ports/item-review.repository';
import type { CategoryClassifier } from '../domain/ports/category-classifier.port';
import type { DescriptionSummarizer } from '../domain/ports/description-summarizer.port';
import type { ImportFileTextExtractor } from '../domain/ports/import-file-text-extractor.port';
import type { ItemImportParser } from '../domain/ports/item-import-parser.port';
import type { MetadataPopulator } from '../domain/ports/metadata-populator.port';
import type { MetadataScraper } from '../domain/ports/metadata-scraper.port';
import type { PageContextFetcher } from '../domain/ports/page-context.port';
import type { ProductResearcher } from '../domain/ports/product-researcher.port';
import type { RemoteImageFetcher } from '../domain/ports/remote-image-fetcher.port';
import type { ReviewExtractor } from '../domain/ports/review-extractor.port';

export interface ItemModuleDeps {
  itemRepo: ItemRepository;
  audienceRepo: ItemAudienceRepository;
  fieldRepo: ItemFieldRepository;
  itemReviewRepo: ItemReviewRepository;
  reviewExtractor: ReviewExtractor;
  metadataPopulator: MetadataPopulator;
  categoryClassifier: CategoryClassifier;
  descriptionSummarizer: DescriptionSummarizer;
  itemImportParser: ItemImportParser;
  importFileTextExtractor: ImportFileTextExtractor;
  pageContextFetcher: PageContextFetcher;
  productResearcher: ProductResearcher;
  remoteImageFetcher: RemoteImageFetcher;
  wishlistRepo: WishlistRepository;
  listShareRepo: ListShareRepository;
  userRepo: UserRepository;
  assertUserCanUseCase: AssertUserCanUseCase;
  metadataScraper: MetadataScraper;
  serverConfigRepo: ServerConfigRepository;
  middleware: RouteMiddleware;
  listChanged: ListChangedPublisher;
  eventBus: EventBus;
  createNotification?: CreateNotificationUseCase;
  commentRepo?: CommentRepository;
  commentRealtime?: CommentRealtimePublisher;
}
