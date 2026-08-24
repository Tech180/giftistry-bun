import { describe, expect, test, beforeEach } from 'bun:test';
import {
  addUserWsConnection,
  removeUserWsConnection,
  isUserForegroundConnected,
  clearUserWsRegistry,
} from './user-ws-registry';

describe('user-ws-registry', () => {
  beforeEach(() => {
    clearUserWsRegistry();
  });

  test('returns false when no connections', () => {
    expect(isUserForegroundConnected('user-1')).toBe(false);
  });

  test('returns true while a connection is open', () => {
    addUserWsConnection('user-1', 'ws-1');
    expect(isUserForegroundConnected('user-1')).toBe(true);
    expect(isUserForegroundConnected('user-2')).toBe(false);
  });

  test('returns false after last connection removed', () => {
    addUserWsConnection('user-1', 'ws-1');
    addUserWsConnection('user-1', 'ws-2');
    removeUserWsConnection('user-1', 'ws-1');
    expect(isUserForegroundConnected('user-1')).toBe(true);
    removeUserWsConnection('user-1', 'ws-2');
    expect(isUserForegroundConnected('user-1')).toBe(false);
  });
});
