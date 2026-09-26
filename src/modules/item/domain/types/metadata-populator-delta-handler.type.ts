export type MetadataPopulatorDeltaHandler = (delta: {
  tokensPerSecond: number | null;
}) => void | Promise<void>;
