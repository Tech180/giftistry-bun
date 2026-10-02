import type { HostResolver } from './host-resolver.type';

export interface SafeFetchOptions {
  timeoutMs?: number;
  headers?: Record<string, string>;
  maxBytes?: number;
  maxRedirects?: number;
  allowedPorts?: ReadonlySet<number>;
  contentTypeAllowlist?: readonly string[];
  resolver?: HostResolver;
  /** When false, skip content-type allowlist (e.g. images). */
  enforceHtmlContentType?: boolean;
  method?: string;
}
