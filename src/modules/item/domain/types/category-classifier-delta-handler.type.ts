export type CategoryClassifierDeltaHandler = (delta: {
  tokensPerSecond: number | null;
}) => void | Promise<void>;
