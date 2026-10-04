import { GIPHY_CDN_HOST_SUFFIXES } from '../constants/giphy-cdn-hosts.constant';

export function isGiphyCdnHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return GIPHY_CDN_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}
