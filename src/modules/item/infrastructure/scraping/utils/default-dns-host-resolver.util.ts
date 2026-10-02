import { lookup } from 'node:dns/promises';
import type { HostResolver } from '../interfaces/host-resolver.type';

export const defaultDnsHostResolver: HostResolver = async (hostname) => {
  const answers = await lookup(hostname, { all: true });
  return answers.map((a) => a.address);
};
