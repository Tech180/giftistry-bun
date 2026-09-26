export type NotificationTransport = (userId: string, payload: Record<string, unknown>) => void;
