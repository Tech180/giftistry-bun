import type { CustomPackSettingsDto } from '../packs';
import type { AiProvider } from '../types/ai-provider.type';
import type { ConnectionType } from '../types/connection-type.type';

export interface ServerConfig {
  DbType: ConnectionType;
  DbUrl?: string;
  SmtpType: ConnectionType;
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
  PublicAppUrl?: string;
  AllowSetup?: boolean;
  /** Server owner first-run onboarding completed once. */
  OwnerOnboardingCompleted?: boolean;
  /** @deprecated Prefer OwnerOnboardingCompleted; still read for migration. */
  AdminOnboardingCompleted?: boolean;
  OAuthEnabled?: boolean;
  OAuthIssuerUrl?: string;
  OAuthClientId?: string;
  OAuthClientSecret?: string;
  OAuthScopes?: string;
  OAuthAutoRegister?: boolean;
  OAuthAutoLaunch?: boolean;
  AiEnabled?: boolean;
  AiWebSearchEnabled?: boolean;
  AiRateLimitEnabled?: boolean;
  AiFastProvider?: AiProvider;
  AiFastEndpoint?: string;
  AiFastApiKey?: string;
  AiFastModel?: string;
  AiIntelligentProvider?: AiProvider;
  AiIntelligentEndpoint?: string;
  AiIntelligentApiKey?: string;
  AiIntelligentModel?: string;
  AiPrompt?: string;
  AiDescriptionPrompt?: string;
  AiPopulatePrompt?: string;
  AiCategoryPrompt?: string;
  AiImportPrompt?: string;
  AiImportChunkingEnabled?: boolean;
  AiImportChunkItemLimit?: number;
  AiEnabledPackIds?: string[];
  AiCustomPacks?: CustomPackSettingsDto[];
  AiCompletionTimeoutMs?: number;
  AiConnectTimeoutMs?: number;
  ScrapeFetchTimeoutMs?: number;
  ScrapePlaywrightTimeoutMs?: number;
  GrabInfoConcurrency?: number;
  GrabInfoConcurrencyUnlimited?: boolean;
  GrabInfoActiveStreamLimit?: number;
  /** Push: ntfy (primary) */
  NtfyEnabled?: boolean;
  NtfyBaseUrl?: string;
  NtfyAuthToken?: string;
  NtfyTopicPrefix?: string;
  /** Push: WebPush / Android FCM fallback */
  WebPushEnabled?: boolean;
  WebPushVapidPublicKey?: string;
  WebPushVapidPrivateKey?: string;
  WebPushSubject?: string;
  /** Push: FCM HTTP v1 / iOS fallback */
  FcmEnabled?: boolean;
  FcmProjectId?: string;
  FcmServiceAccountJson?: string;
}
