import type * as client from 'openid-client';

/** Process-wide cached OIDC issuer configuration. */
export const OIDC_CONFIGURATION_CACHE: {
  configuration: client.Configuration | null;
  issuerUrl: string;
} = {
  configuration: null,
  issuerUrl: '',
};
