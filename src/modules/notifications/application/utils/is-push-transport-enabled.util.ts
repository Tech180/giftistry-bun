import type { PushTransport } from '../../domain/types/push-transport.type';
import type { PushTransportFlags } from '../interfaces/push-transport-flags.interface';

export function isPushTransportEnabled(
  transport: PushTransport,
  flags: PushTransportFlags
): boolean {
  if (transport === 'ntfy') return flags.NtfyEnabled;
  if (transport === 'webpush') return flags.WebPushEnabled;
  if (transport === 'fcm') return flags.FcmEnabled;
  return false;
}
