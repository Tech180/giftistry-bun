import type { AddCommentUseCase } from '../application/add-comment.use-case';
import type { ListCommentsUseCase } from '../application/list-comments.use-case';
import type { DeleteCommentUseCase } from '../application/delete-comment.use-case';

export interface CommentUseCases {
  addComment: AddCommentUseCase;
  listComments: ListCommentsUseCase;
  deleteComment: DeleteCommentUseCase;
}
