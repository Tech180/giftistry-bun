import { Elysia } from 'elysia';
import type { RouteMiddleware } from '@/common/types/route-middleware';
import type { CommentRepository } from './domain/ports/comment.repository';
import type { WishlistRepository } from '@/modules/wishlist/domain/ports/wishlist.repository';
import type { AssertUserCanUseCase } from '@/common/application/user-policy.use-cases';
import { AddCommentUseCase } from './application/add-comment.use-case';
import { ListCommentsUseCase } from './application/list-comments.use-case';
import { DeleteCommentUseCase } from './application/delete-comment.use-case';
import { ToggleReactionUseCase } from './application/toggle-reaction.use-case';
import { commentRoutes } from './presentation/comment.routes';

export interface CommentModuleDeps {
  commentRepo: CommentRepository;
  wishlistRepo: WishlistRepository;
  assertUserCanUseCase: AssertUserCanUseCase;
  middleware: RouteMiddleware;
}

export function createCommentModule(deps: CommentModuleDeps) {
  return new Elysia().use(
    commentRoutes(
      {
        addComment: new AddCommentUseCase(
          deps.commentRepo,
          deps.wishlistRepo,
          deps.assertUserCanUseCase
        ),
        listComments: new ListCommentsUseCase(deps.commentRepo, deps.wishlistRepo),
        deleteComment: new DeleteCommentUseCase(deps.commentRepo),
        toggleReaction: new ToggleReactionUseCase(deps.commentRepo),
      },
      deps.middleware
    )
  );
}
