import { sql } from '@/common/database/connection';

export async function writeAuditLog(params: {
  actorId?: string | null;
  targetId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_log (actor_id, target_id, action, metadata, ip_address)
      VALUES (
        ${params.actorId ?? null},
        ${params.targetId ?? null},
        ${params.action},
        ${JSON.stringify(params.metadata ?? {})}::jsonb,
        ${params.ip ?? null}
      )
    `;
  } catch (err) {
    console.error('[WARN] Failed to write audit log:', err);
  }
}
