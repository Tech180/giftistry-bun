import type { RouteMiddleware } from '@/boot/interfaces/route-middleware.interface';
import type { AssertUserCanUseCase } from '@/common/application/use-cases/user-policy.use-cases';
import type { ListShareRepository, WishlistRepository } from '@/modules/wishlist';
import type { CommentRepository } from '../domain/ports/comment.repository';
import type { CommentRealtimePublisher } from '../domain/ports/comment-realtime-publisher.port';

export interface CommentModuleDeps {
  commentRepo: CommentRepository;
  wishlistRepo: WishlistRepository;
  listShareRepo: ListShareRepository;
  assertUserCanUseCase: AssertUserCanUseCase;
  commentRealtime: CommentRealtimePublisher;
  middleware: RouteMiddleware;
}
