export type CommentRealtimeEventType =
  | 'comment.created'
  | 'comment.deleted'
  | 'reaction.toggled';

export interface CommentRealtimePublisher {
  publish(
    listId: string,
    type: CommentRealtimeEventType,
    data: Record<string, unknown>
  ): void;
}
