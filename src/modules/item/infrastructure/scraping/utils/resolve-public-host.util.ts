import type { HostResolver } from '../interfaces/host-resolver.type';
import { isPrivateNetworkAddress } from '../../../domain/utils/is-private-network-address.util';
import { defaultDnsHostResolver } from './default-dns-host-resolver.util';

/**
 * Resolve hostname and reject if any answer is a private/reserved address.
 */
export async function resolvePublicHost(
  hostname: string,
  resolver: HostResolver = defaultDnsHostResolver
): Promise<string[]> {
  if (isPrivateNetworkAddress(hostname)) {
    throw new Error(`Unsafe hostname: ${hostname}`);
  }

  const addresses = await resolver(hostname);
  if (!addresses.length) {
    throw new Error(`DNS returned no addresses for ${hostname}`);
  }

  for (const address of addresses) {
    if (isPrivateNetworkAddress(address)) {
      throw new Error(`Hostname ${hostname} resolves to private address ${address}`);
    }
  }

  return addresses;
}
