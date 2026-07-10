export type DbConnectionType = 'local' | 'remote';
export type SmtpConnectionType = 'local' | 'remote';
export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'local' | 'openrouter';

export interface ServerConfig {
  dbType: DbConnectionType;
  dbUrl?: string;
  smtpType: SmtpConnectionType;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  smtpFrom?: string;
  aiEnabled?: boolean;
  aiProvider?: AiProvider;
  aiApiKey?: string;
  aiModel?: string;
  aiPrompt?: string;
  aiEndpoint?: string;
}

export interface AdminSetupCredentials {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface SetupPayload {
  dbType: string;
  dbUrl?: string;
  smtpType: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  smtpFrom?: string;
  admin: AdminSetupCredentials;
}

export interface SystemSettingsPayload {
  dbType: string;
  dbUrl?: string;
  smtpType: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  smtpFrom?: string;
  aiEnabled?: boolean;
  aiProvider?: string;
  aiApiKey?: string;
  aiModel?: string;
  aiPrompt?: string;
  aiEndpoint?: string;
}

export interface SystemSettingsView {
  dbType: DbConnectionType;
  dbUrl: string;
  smtpType: SmtpConnectionType;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
  smtpFrom: string;
  aiEnabled: boolean;
  aiProvider: string;
  aiApiKey: string;
  aiModel: string;
  aiPrompt: string;
  aiEndpoint: string;
}

export interface TransferTargetUser {
  id: string;
  username: string;
  isDisabled: boolean;
}

export interface CreateAdminUserParams {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  authHash: string;
}

const MASKED_SECRET = '******';

export function maskSecret(value?: string): string {
  return value ? MASKED_SECRET : '';
}

export function resolveMaskedSecret(incoming: string | undefined, existing: string | undefined): string {
  if (incoming === MASKED_SECRET) {
    return existing || '';
  }
  return incoming || '';
}

export function toSystemSettingsView(config: ServerConfig): SystemSettingsView {
  return {
    dbType: config.dbType,
    dbUrl: config.dbUrl || '',
    smtpType: config.smtpType,
    smtpHost: config.smtpHost || '',
    smtpPort: config.smtpPort !== undefined ? config.smtpPort : 1025,
    smtpUser: config.smtpUser || '',
    smtpPass: maskSecret(config.smtpPass),
    smtpSecure: !!config.smtpSecure,
    smtpFrom: config.smtpFrom || 'noreply@giftistry.local',
    aiEnabled: !!config.aiEnabled,
    aiProvider: config.aiProvider || 'gemini',
    aiApiKey: maskSecret(config.aiApiKey),
    aiModel: config.aiModel || '',
    aiPrompt: config.aiPrompt || '',
    aiEndpoint: config.aiEndpoint || '',
  };
}
