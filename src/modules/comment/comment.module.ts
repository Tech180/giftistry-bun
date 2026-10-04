import { Elysia } from 'elysia';
import { AddCommentUseCase } from './application/use-cases/add-comment.use-case';
import { ListCommentsUseCase } from './application/use-cases/list-comments.use-case';
import { DeleteCommentUseCase } from './application/use-cases/delete-comment.use-case';
import { ToggleReactionUseCase } from './application/use-cases/toggle-reaction.use-case';
import { NotifyCommentMentionsUseCase } from './application/use-cases/notify-comment-mentions.use-case';
import type { CommentModuleDeps } from './interfaces/comment-module-deps.interface';
import { commentRoutes } from './presentation/comment.routes';

export function createCommentModule(deps: CommentModuleDeps) {
  const notifyCommentMentions = deps.createNotification
    ? new NotifyCommentMentionsUseCase(deps.createNotification)
    : undefined;

  return new Elysia().use(
    commentRoutes({
      useCases: {
        addComment: new AddCommentUseCase(
          deps.commentRepo,
          deps.wishlistRepo,
          deps.assertUserCanUseCase,
          deps.listShareRepo,
          deps.commentRealtime,
          notifyCommentMentions
        ),
        listComments: new ListCommentsUseCase(deps.commentRepo, deps.wishlistRepo),
        deleteComment: new DeleteCommentUseCase(deps.commentRepo, deps.commentRealtime),
        toggleReaction: new ToggleReactionUseCase(deps.commentRepo, deps.commentRealtime),
      },
      middleware: deps.middleware,
    })
  );
}
