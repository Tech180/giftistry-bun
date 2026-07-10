export interface AuditLogEntry {
  actorId?: string | null;
  targetId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

export interface AuditLogOverviewEntry {
  Id: string;
  Action: string;
  CreatedAt: Date | string;
  ActorUsername: string | null;
  TargetUsername: string | null;
}

export interface AuditLogListEntry extends AuditLogOverviewEntry {
  Metadata?: unknown;
  Ip: string | null;
}

export interface AuditLogListResult {
  entries: AuditLogListEntry[];
  page: number;
  total: number;
}

export interface AuditLogRepository {
  write(entry: AuditLogEntry): Promise<void>;
  listRecent(limit: number): Promise<AuditLogOverviewEntry[]>;
  list(page: number, limit: number, actionFilter: string): Promise<AuditLogListResult>;
}
