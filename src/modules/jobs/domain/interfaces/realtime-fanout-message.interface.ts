export interface RealtimeFanoutMessage {
  room: string;
  payload: Record<string, unknown>;
}
