import type { LimitedBodyResult } from '../interfaces/limited-body-result.interface';

/** Streaming-ish body read that aborts after maxBytes (decoded as text). */
export async function readLimitedBody(
  response: Response,
  maxBytes: number
): Promise<LimitedBodyResult> {
  const contentLength = Number(response.headers.get('content-length') || '');
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    const slice = buffer.subarray(0, maxBytes);
    return { body: new TextDecoder('utf-8', { fatal: false }).decode(slice), truncated: true };
  }

  if (!response.body) {
    const text = await response.text();
    if (text.length > maxBytes) {
      return { body: text.slice(0, maxBytes), truncated: true };
    }
    return { body: text, truncated: false };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value?.byteLength) {
      continue;
    }
    if (total + value.byteLength > maxBytes) {
      const remaining = maxBytes - total;
      if (remaining > 0) {
        chunks.push(value.subarray(0, remaining));
        total += remaining;
      }
      truncated = true;
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    body: new TextDecoder('utf-8', { fatal: false }).decode(merged),
    truncated,
  };
}
