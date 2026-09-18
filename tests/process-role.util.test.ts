import { describe, expect, test } from 'bun:test';
import {
  resolveProcessRole,
  shouldListenRealtimeFanout,
  shouldRunJobs,
  shouldServeHttp,
} from '../src/common/utils/process-role.util';

describe('process-role.util', () => {
  test('defaults to all when unset or empty', () => {
    expect(resolveProcessRole({})).toBe('all');
    expect(resolveProcessRole({ GIFTISTRY_PROCESS_ROLE: '' })).toBe('all');
    expect(resolveProcessRole({ GIFTISTRY_PROCESS_ROLE: '  ' })).toBe('all');
  });

  test('accepts api, worker, all case-insensitively', () => {
    expect(resolveProcessRole({ GIFTISTRY_PROCESS_ROLE: 'api' })).toBe('api');
    expect(resolveProcessRole({ GIFTISTRY_PROCESS_ROLE: 'WORKER' })).toBe('worker');
    expect(resolveProcessRole({ GIFTISTRY_PROCESS_ROLE: ' All ' })).toBe('all');
  });

  test('invalid values fall back to all', () => {
    expect(resolveProcessRole({ GIFTISTRY_PROCESS_ROLE: 'jobs' })).toBe('all');
    expect(resolveProcessRole({ GIFTISTRY_PROCESS_ROLE: '1' })).toBe('all');
  });

  test('predicates', () => {
    expect(shouldServeHttp('api')).toBe(true);
    expect(shouldServeHttp('all')).toBe(true);
    expect(shouldServeHttp('worker')).toBe(false);

    expect(shouldRunJobs('worker')).toBe(true);
    expect(shouldRunJobs('all')).toBe(true);
    expect(shouldRunJobs('api')).toBe(false);

    expect(shouldListenRealtimeFanout('api')).toBe(true);
    expect(shouldListenRealtimeFanout('all')).toBe(false);
    expect(shouldListenRealtimeFanout('worker')).toBe(false);
  });
});
