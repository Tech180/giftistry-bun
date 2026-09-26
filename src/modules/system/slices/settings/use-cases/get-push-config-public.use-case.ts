import type { ServerConfigRepository } from '../../../domain/ports/server-config.repository';
import type { PushConfigPublic } from '../interfaces/push-config-public.interface';

export class GetPushConfigPublicUseCase {
  constructor(private serverConfigRepo: ServerConfigRepository) {}

  execute(): PushConfigPublic {
    const config = this.serverConfigRepo.load();
    return {
      NtfyEnabled: !!config.NtfyEnabled,
      NtfyBaseUrl: config.NtfyBaseUrl || 'https://ntfy.sh',
      WebPushEnabled: !!config.WebPushEnabled,
      WebPushVapidPublicKey: config.WebPushVapidPublicKey || '',
      FcmEnabled: !!config.FcmEnabled,
    };
  }
}
