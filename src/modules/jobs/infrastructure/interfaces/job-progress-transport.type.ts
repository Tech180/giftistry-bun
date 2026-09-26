export type JobProgressTransport = (
  listId: string | null,
  userId: string | null,
  payload: Record<string, unknown>
) => void;
