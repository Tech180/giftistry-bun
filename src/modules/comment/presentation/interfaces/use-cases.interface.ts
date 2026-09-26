import type { AddCommentUseCase } from '../../application/use-cases/add-comment.use-case';
import type { ListCommentsUseCase } from '../../application/use-cases/list-comments.use-case';
import type { DeleteCommentUseCase } from '../../application/use-cases/delete-comment.use-case';
import type { ToggleReactionUseCase } from '../../application/use-cases/toggle-reaction.use-case';

export interface UseCases {
  addComment: AddCommentUseCase;
  listComments: ListCommentsUseCase;
  deleteComment: DeleteCommentUseCase;
  toggleReaction: ToggleReactionUseCase;
}
