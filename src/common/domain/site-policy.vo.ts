import {
  DEFAULT_SITE_POLICY,
  mergeSitePolicy,
  type SitePolicy,
} from '@/common/types/user-policy';

export { type SitePolicy };

export class SitePolicyVO {
  private constructor(readonly data: SitePolicy) {}

  static create(raw: unknown): SitePolicyVO {
    return new SitePolicyVO(mergeSitePolicy(raw));
  }

  static default(): SitePolicyVO {
    return new SitePolicyVO({
      ...DEFAULT_SITE_POLICY,
      DefaultUserPolicy: { ...DEFAULT_SITE_POLICY.DefaultUserPolicy },
    });
  }

  get value(): SitePolicy {
    return this.data;
  }

  allowsPasswordLogin(): boolean {
    return this.data.AllowPasswordLogin;
  }

  isMaintenanceMode(): boolean {
    return this.data.MaintenanceMode;
  }

  getLoginAttemptsBeforeLockout(): number {
    return this.data.LoginAttemptsBeforeLockout;
  }

  getLockoutDurationMinutes(): number {
    return this.data.LockoutDurationMinutes;
  }
}
