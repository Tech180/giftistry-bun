import postgres from 'postgres';
import { env } from '../consts/env.consts';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'config.json');

export interface SystemConfig {
  dbType: 'local' | 'remote';
  dbUrl?: string;
  smtpType: 'local' | 'remote';
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  smtpFrom?: string;
  aiEnabled?: boolean;
  aiProvider?: 'gemini' | 'openai' | 'anthropic' | 'local' | 'openrouter';
  aiApiKey?: string;
  aiModel?: string;
  aiPrompt?: string;
  aiEndpoint?: string;
}

export function loadConfig(): SystemConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      return {
        dbType: data.dbType || 'local',
        dbUrl: data.dbUrl || '',
        smtpType: data.smtpType || 'local',
        smtpHost: data.smtpHost || '',
        smtpPort: data.smtpPort !== undefined ? Number(data.smtpPort) : undefined,
        smtpUser: data.smtpUser || '',
        smtpPass: data.smtpPass || '',
        smtpSecure: data.smtpSecure !== undefined ? Boolean(data.smtpSecure) : undefined,
        smtpFrom: data.smtpFrom || '',
        aiEnabled: data.aiEnabled !== undefined ? Boolean(data.aiEnabled) : undefined,
        aiProvider: data.aiProvider || 'gemini',
        aiApiKey: data.aiApiKey || '',
        aiModel: data.aiModel || '',
        aiPrompt: data.aiPrompt || '',
        aiEndpoint: data.aiEndpoint || '',
      };
    } catch {
      // ignore
    }
  }
  return {
    dbType: 'local',
    smtpType: 'local',
  };
}

export function saveConfig(config: SystemConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
  reinitializeDbConnection();
}

function createSqlClient(config: SystemConfig) {
  if (config.dbType === 'remote' && config.dbUrl) {
    return postgres(config.dbUrl);
  } else {
    return postgres({
      host: env.PGHOST,
      port: env.PGPORT,
      username: env.PGUSER,
      password: env.PGPASSWORD,
      database: env.PGDATABASE,
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
