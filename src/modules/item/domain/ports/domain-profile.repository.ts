import type { DomainProfile } from '../interfaces/domain-profile.interface';

export interface DomainProfileRepository {
  get(hostname: string): Promise<DomainProfile | null>;
  upsert(profile: DomainProfile): Promise<void>;
}
