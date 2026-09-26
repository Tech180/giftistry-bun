import type { GiftistryProcessRole } from './types/giftistry-process-role.type';

export function resolveProcessRole(
  env: NodeJS.ProcessEnv = process.env
): GiftistryProcessRole {
  const raw = (env.GIFTISTRY_PROCESS_ROLE || 'all').trim().toLowerCase();
  if (raw === 'api' || raw === 'worker' || raw === 'all') return raw;
  return 'all';
}

export function shouldServeHttp(role: GiftistryProcessRole): boolean {
  return role === 'api' || role === 'all';
}

export function shouldRunJobs(role: GiftistryProcessRole): boolean {
  return role === 'worker' || role === 'all';
}

/** Worker→API bridge only; `all` uses in-process WebSocket publishers. */
export function shouldListenRealtimeFanout(role: GiftistryProcessRole): boolean {
  return role === 'api';
}
