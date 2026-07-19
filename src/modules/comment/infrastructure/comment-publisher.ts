export type CommentPublisher = (listId: string, payload: Record<string, unknown>) => void;

let publisher: CommentPublisher | null = null;

export function setCommentPublisher(fn: CommentPublisher | null): void {
  publisher = fn;
}

export function publishCommentEvent(
  listId: string,
  type: 'comment.created' | 'comment.deleted' | 'reaction.toggled',
  data: Record<string, unknown>
): void {
  if (!publisher) return;
  publisher(listId, {
    Type: type,
    ...data,
  });
}
