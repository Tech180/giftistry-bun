export interface RateLimitConfig {
  windowMs: number;
  max: number;
  paths?: string[];
  /** When true, skipped if isAiRateLimitEnabled returns false */
  respectAiRateLimitToggle?: boolean;
  /** Required when respectAiRateLimitToggle is true */
  isAiRateLimitEnabled?: () => boolean;
}

export interface RateLimitRecord {
  count: number;
  resetTime: number;
}
