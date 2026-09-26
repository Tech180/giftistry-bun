import type { SitePolicy } from '@/common/domain/interfaces/site-policy.interface';
import { mergeSitePolicy } from '@/common/domain/utils/merge-site-policy.util';
import type { SitePolicyRequest } from '../interfaces/site-policy-request.interface';

export function mapSitePolicyPayload(raw: SitePolicyRequest): SitePolicy {
  return mergeSitePolicy(raw);
}
