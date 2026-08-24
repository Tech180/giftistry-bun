import type { ServerConfigRepository } from '../domain/ports/server-config.repository';

export interface PushConfigPublic {
  NtfyEnabled: boolean;
  NtfyBaseUrl: string;
  WebPushEnabled: boolean;
  WebPushVapidPublicKey: string;
  FcmEnabled: boolean;
}

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
