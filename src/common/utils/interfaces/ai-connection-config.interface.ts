export interface AiConnectionConfig {
  AiFastProvider?: string;
  AiFastEndpoint?: string;
  AiFastApiKey?: string;
  AiFastModel?: string;
  AiIntelligentProvider?: string;
  AiIntelligentEndpoint?: string;
  AiIntelligentApiKey?: string;
  AiIntelligentModel?: string;
  /** @deprecated migration only — prefer slot fields */
  AiProvider?: string;
  AiEndpoint?: string;
  AiApiKey?: string;
  AiModel?: string;
}
