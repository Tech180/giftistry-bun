import postgres from 'postgres';
import { env } from '../consts/env.consts';
import * as fs from 'fs';
import * as path from 'path';
import { normalizeAiProvider, type AiProvider } from '@/modules/system/domain/server-config.entity';

const CONFIG_PATH = path.join(process.cwd(), 'config.json');

export interface SystemConfig {
  DbType: 'local' | 'remote';
  DbUrl?: string;
  SmtpType: 'local' | 'remote';
  SmtpHost?: string;
  SmtpPort?: number;
  SmtpUser?: string;
  SmtpPass?: string;
  SmtpSecure?: boolean;
  SmtpFrom?: string;
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
  AiCompletionTimeoutMs?: number;
  ScrapeFetchTimeoutMs?: number;
  ScrapePlaywrightTimeoutMs?: number;
}

function pick<T>(data: Record<string, unknown>, pascal: string, camel: string, fallback: T): T {
  if (data[pascal] !== undefined && data[pascal] !== null) return data[pascal] as T;
  if (data[camel] !== undefined && data[camel] !== null) return data[camel] as T;
  return fallback;
}

function hasKey(data: Record<string, unknown>, pascal: string, camel: string): boolean {
  return data[pascal] !== undefined || data[camel] !== undefined;
}

function normalizeConfig(data: Record<string, unknown>): SystemConfig {
  const legacyModel = String(pick(data, 'AiModel', 'aiModel', '')).trim();
  const hasFast = hasKey(data, 'AiFastModel', 'aiFastModel');
  const hasIntelligent = hasKey(data, 'AiIntelligentModel', 'aiIntelligentModel');
  const fastModel = hasFast
    ? String(pick(data, 'AiFastModel', 'aiFastModel', '')).trim()
    : legacyModel;
  const intelligentModel = hasIntelligent
    ? String(pick(data, 'AiIntelligentModel', 'aiIntelligentModel', '')).trim()
    : legacyModel;

  const legacyProvider = pick<unknown>(data, 'AiProvider', 'aiProvider', undefined);
  const legacyEndpoint = String(pick(data, 'AiEndpoint', 'aiEndpoint', '')).trim();
  const legacyApiKey = String(pick(data, 'AiApiKey', 'aiApiKey', '')).trim();

  const fastProviderRaw = hasKey(data, 'AiFastProvider', 'aiFastProvider')
    ? pick(data, 'AiFastProvider', 'aiFastProvider', legacyProvider)
    : legacyProvider;
  const intelligentProviderRaw = hasKey(data, 'AiIntelligentProvider', 'aiIntelligentProvider')
    ? pick(data, 'AiIntelligentProvider', 'aiIntelligentProvider', legacyProvider)
    : legacyProvider;

  const fastEndpoint = hasKey(data, 'AiFastEndpoint', 'aiFastEndpoint')
    ? String(pick(data, 'AiFastEndpoint', 'aiFastEndpoint', '')).trim()
    : legacyEndpoint;
  const intelligentEndpoint = hasKey(data, 'AiIntelligentEndpoint', 'aiIntelligentEndpoint')
    ? String(pick(data, 'AiIntelligentEndpoint', 'aiIntelligentEndpoint', '')).trim()
    : legacyEndpoint;

  const fastApiKey = hasKey(data, 'AiFastApiKey', 'aiFastApiKey')
    ? String(pick(data, 'AiFastApiKey', 'aiFastApiKey', '')).trim()
    : legacyApiKey;
  const intelligentApiKey = hasKey(data, 'AiIntelligentApiKey', 'aiIntelligentApiKey')
    ? String(pick(data, 'AiIntelligentApiKey', 'aiIntelligentApiKey', '')).trim()
    : legacyApiKey;

  const rateLimitRaw = pick<unknown>(data, 'AiRateLimitEnabled', 'aiRateLimitEnabled', undefined);

  return {
    DbType: pick(data, 'DbType', 'dbType', 'local' as const),
    DbUrl: pick(data, 'DbUrl', 'dbUrl', ''),
    SmtpType: pick(data, 'SmtpType', 'smtpType', 'local' as const),
    SmtpHost: pick(data, 'SmtpHost', 'smtpHost', ''),
    SmtpPort: (() => {
      const value = pick<unknown>(data, 'SmtpPort', 'smtpPort', undefined);
      return value !== undefined ? Number(value) : undefined;
    })(),
    SmtpUser: pick(data, 'SmtpUser', 'smtpUser', ''),
    SmtpPass: pick(data, 'SmtpPass', 'smtpPass', ''),
    SmtpSecure: (() => {
      const value = pick<unknown>(data, 'SmtpSecure', 'smtpSecure', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    SmtpFrom: pick(data, 'SmtpFrom', 'smtpFrom', ''),
    AiEnabled: (() => {
      const value = pick<unknown>(data, 'AiEnabled', 'aiEnabled', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    AiWebSearchEnabled: (() => {
      const value = pick<unknown>(data, 'AiWebSearchEnabled', 'aiWebSearchEnabled', undefined);
      return value !== undefined ? Boolean(value) : undefined;
    })(),
    AiRateLimitEnabled: rateLimitRaw !== undefined ? Boolean(rateLimitRaw) : true,
    AiFastProvider: normalizeAiProvider(fastProviderRaw ?? 'openrouter'),
    AiFastEndpoint: fastEndpoint,
    AiFastApiKey: fastApiKey,
    AiFastModel: fastModel,
    AiIntelligentProvider: normalizeAiProvider(intelligentProviderRaw ?? 'openrouter'),
    AiIntelligentEndpoint: intelligentEndpoint,
    AiIntelligentApiKey: intelligentApiKey,
    AiIntelligentModel: intelligentModel,
    AiPrompt: pick(data, 'AiPrompt', 'aiPrompt', ''),
    AiDescriptionPrompt: pick(data, 'AiDescriptionPrompt', 'aiDescriptionPrompt', ''),
    AiPopulatePrompt: pick(data, 'AiPopulatePrompt', 'aiPopulatePrompt', ''),
    AiCategoryPrompt: pick(data, 'AiCategoryPrompt', 'aiCategoryPrompt', ''),
    AiImportPrompt: pick(data, 'AiImportPrompt', 'aiImportPrompt', ''),
    AiCompletionTimeoutMs: (() => {
      const value = pick<unknown>(
        data,
        'AiCompletionTimeoutMs',
        'aiCompletionTimeoutMs',
        undefined
      );
      return value !== undefined ? Number(value) : undefined;
    })(),
    ScrapeFetchTimeoutMs: (() => {
      const value = pick<unknown>(data, 'ScrapeFetchTimeoutMs', 'scrapeFetchTimeoutMs', undefined);
      return value !== undefined ? Number(value) : undefined;
    })(),
    ScrapePlaywrightTimeoutMs: (() => {
      const value = pick<unknown>(
        data,
        'ScrapePlaywrightTimeoutMs',
        'scrapePlaywrightTimeoutMs',
        undefined
      );
      return value !== undefined ? Number(value) : undefined;
    })(),
  };
}

function needsConfigRewrite(data: Record<string, unknown>): boolean {
  const hasLegacyModel = data.AiModel !== undefined || data.aiModel !== undefined;
  const missingFast = data.AiFastModel === undefined && data.aiFastModel === undefined;
  const missingIntelligent =
    data.AiIntelligentModel === undefined && data.aiIntelligentModel === undefined;
  const hasSharedTrio =
    data.AiProvider !== undefined ||
    data.aiProvider !== undefined ||
    data.AiEndpoint !== undefined ||
    data.aiEndpoint !== undefined ||
    data.AiApiKey !== undefined ||
    data.aiApiKey !== undefined;
  const missingSlotProviders =
    !hasKey(data, 'AiFastProvider', 'aiFastProvider') ||
    !hasKey(data, 'AiIntelligentProvider', 'aiIntelligentProvider');
  return (
    hasLegacyModel ||
    missingFast ||
    missingIntelligent ||
    hasSharedTrio ||
    missingSlotProviders ||
    hasCamelConfigKeys(data)
  );
}

function hasCamelConfigKeys(data: Record<string, unknown>): boolean {
  return Object.keys(data).some((key) => /^[a-z]/.test(key));
}

export function loadConfig(): SystemConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as Record<string, unknown>;
      const config = normalizeConfig(data);
      if (needsConfigRewrite(data)) {
        saveConfig(config);
      }
      return config;
    } catch {
      // ignore
    }
  }
  return {
    DbType: 'local',
    SmtpType: 'local',
    AiRateLimitEnabled: true,
    AiFastProvider: 'openrouter',
    AiIntelligentProvider: 'openrouter',
  };
}

export function saveConfig(config: SystemConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  reinitializeDbConnection();
}

function createSqlClient(config: SystemConfig) {
  if (config.DbType === 'remote' && config.DbUrl) {
    return postgres(config.DbUrl, {
      max: 10,
      idle_timeout: 5,
    });
  } else {
    return postgres({
      host: env.PGHOST,
      port: env.PGPORT,
      username: env.PGUSER,
      password: env.PGPASSWORD,
      database: env.PGDATABASE,
      max: 10,
      idle_timeout: 5,
    });
  }
}

let activeSql = createSqlClient(loadConfig());

export function reinitializeDbConnection() {
  const config = loadConfig();
  const oldSql = activeSql;
  activeSql = createSqlClient(config);
  try {
    oldSql.end();
  } catch (err) {
    console.error('Error closing old DB pool:', err);
  }
}

// Export sql as a Proxy that redirects all calls/properties to activeSql
export const sql = new Proxy(() => {}, {
  get(target, prop, receiver) {
    if (prop === 'then') {
      // Avoid resolving the proxy function as a Promise
      return undefined;
    }
    const val = Reflect.get(activeSql, prop);
    if (typeof val === 'function') {
      return val.bind(activeSql);
    }
    return val;
  },
  apply(target, thisArg, argumentsList) {
    return Reflect.apply(activeSql as any, activeSql, argumentsList);
  }
}) as unknown as typeof activeSql;
