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
      defaultUserPolicy: { ...DEFAULT_SITE_POLICY.defaultUserPolicy },
    });
  }

  get value(): SitePolicy {
    return this.data;
  }

  allowsPasswordLogin(): boolean {
    return this.data.allowPasswordLogin;
  }

  isMaintenanceMode(): boolean {
    return this.data.maintenanceMode;
  }

  getLoginAttemptsBeforeLockout(): number {
    return this.data.loginAttemptsBeforeLockout;
  }

  getLockoutDurationMinutes(): number {
    return this.data.lockoutDurationMinutes;
  }
}
