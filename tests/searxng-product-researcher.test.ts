import { describe, expect, test } from 'bun:test';
import { SearxngProductResearcher } from '../src/modules/item/infrastructure/adapters/searxng-product-researcher';
import type { ServerConfigRepository } from '@/modules/system';

function repoWith(config: Record<string, unknown>): ServerConfigRepository {
  return {
    load: () =>
      ({
        DbType: 'local',
        SmtpType: 'local',
        ...config,
      }) as ReturnType<ServerConfigRepository['load']>,
    save: () => {},
  };
}

describe('SearxngProductResearcher', () => {
  test('canHandle is false when endpoint is empty', () => {
    const researcher = new SearxngProductResearcher(repoWith({}));
    expect(researcher.canHandle()).toBe(false);
  });

  test('canHandle is true when endpoint is configured', () => {
    const researcher = new SearxngProductResearcher(
      repoWith({ AiWebSearchEndpoint: 'https://search.example/' })
    );
    expect(researcher.canHandle()).toBe(true);
  });

});
