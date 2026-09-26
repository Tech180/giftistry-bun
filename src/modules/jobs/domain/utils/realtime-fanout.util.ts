import { REALTIME_FANOUT_MAX_BYTES } from '../constants/realtime-fanout.constant';
import type { RealtimeFanoutMessage } from '../interfaces/realtime-fanout-message.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Build a fanout envelope, compacting oversized job payloads to a JobId ref
 * so the API can reload and republish the full job view.
 */
export function encodeRealtimeFanoutMessage(
  room: string,
  payload: Record<string, unknown>
): RealtimeFanoutMessage {
  const full: RealtimeFanoutMessage = { room, payload };
  if (JSON.stringify(full).length <= REALTIME_FANOUT_MAX_BYTES) {
    return full;
  }

  const job = payload.Job;
  if (isRecord(job) && typeof job.Id === 'string') {
    return {
      room,
      payload: {
        Type: payload.Type,
        JobId: job.Id,
        ListId: typeof job.ListId === 'string' || job.ListId === null ? job.ListId : null,
        UserId: typeof job.UserId === 'string' || job.UserId === null ? job.UserId : null,
      },
    };
  }

  console.warn(
    '[RealtimeFanout] payload exceeds NOTIFY limit without a Job.Id; sending Type only'
  );
  return {
    room,
    payload: {
      ...(typeof payload.Type === 'string' ? { Type: payload.Type } : {}),
      ...(typeof payload.JobId === 'string' ? { JobId: payload.JobId } : {}),
    },
  };
}

export function parseRealtimeFanoutMessage(raw: string): RealtimeFanoutMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (typeof parsed.room !== 'string' || !parsed.room.trim()) return null;
    if (!isRecord(parsed.payload)) return null;
    return { room: parsed.room, payload: parsed.payload };
  } catch {
    return null;
  }
}

/** True when the payload is a compact job ref that needs DB hydration. */
export function isCompactJobFanoutPayload(payload: Record<string, unknown>): boolean {
  return typeof payload.JobId === 'string' && payload.Job === undefined;
}
