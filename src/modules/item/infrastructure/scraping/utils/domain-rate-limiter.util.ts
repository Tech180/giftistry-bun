import type { DomainProfileRepository } from '../../../domain/ports/domain-profile.repository';
import { DEFAULT_DOMAIN_MIN_INTERVAL_MS } from '../constants/domain-rate-limiter.constant';

export class DomainRateLimiter {
  private readonly lastRequestAt = new Map<string, number>();

  constructor(
    private readonly profiles: DomainProfileRepository,
    private readonly defaultMinIntervalMs = DEFAULT_DOMAIN_MIN_INTERVAL_MS
  ) {}

  async waitForSlot(url: string): Promise<void> {
    let hostname: string;
    try {
      hostname = new URL(url).hostname.toLowerCase();
    } catch {
      return;
    }

    const profile = await this.profiles.get(hostname);
    const minIntervalMs = profile?.minIntervalMs ?? this.defaultMinIntervalMs;
    const last = this.lastRequestAt.get(hostname) ?? 0;
    const waitMs = last + minIntervalMs - Date.now();
    if (waitMs > 0) {
      await Bun.sleep(waitMs);
    }
    this.lastRequestAt.set(hostname, Date.now());
  }
}
