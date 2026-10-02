import type { DomainProfile } from '../../domain/interfaces/domain-profile.interface';
import type { DomainProfileRepository } from '../../domain/ports/domain-profile.repository';

export class InMemoryDomainProfileRepository implements DomainProfileRepository {
  private readonly store = new Map<string, DomainProfile>();

  async get(hostname: string): Promise<DomainProfile | null> {
    return this.store.get(hostname.toLowerCase()) ?? null;
  }

  async upsert(profile: DomainProfile): Promise<void> {
    this.store.set(profile.hostname.toLowerCase(), {
      ...profile,
      hostname: profile.hostname.toLowerCase(),
    });
  }
}
