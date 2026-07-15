import { describe, expect, test } from 'bun:test';
import {
  serverAllowsWebSearch,
  userAllowsWebSearchProfile,
  wishlistAllowsWebSearch,
} from '../src/common/application/user-web-search-access.util';

describe('user-web-search-access.util', () => {
  test('serverAllowsWebSearch requires AI and web search flags', () => {
    expect(serverAllowsWebSearch({ AiEnabled: true, AiWebSearchEnabled: true })).toBe(true);
    expect(serverAllowsWebSearch({ AiEnabled: true, AiWebSearchEnabled: false })).toBe(false);
    expect(serverAllowsWebSearch({ AiEnabled: false, AiWebSearchEnabled: true })).toBe(false);
  });

  test('userAllowsWebSearchProfile requires AI enabled on profile', () => {
    expect(userAllowsWebSearchProfile({ AiEnabled: true, WebSearchEnabled: true })).toBe(true);
    expect(userAllowsWebSearchProfile({ AiEnabled: false, WebSearchEnabled: true })).toBe(false);
    expect(userAllowsWebSearchProfile({ AiEnabled: true, WebSearchEnabled: false })).toBe(false);
  });

  test('wishlistAllowsWebSearch requires list AI and web search enabled', () => {
    expect(wishlistAllowsWebSearch({ AiEnabled: true, WebSearchEnabled: true })).toBe(true);
    expect(wishlistAllowsWebSearch({ AiEnabled: false, WebSearchEnabled: true })).toBe(false);
    expect(wishlistAllowsWebSearch({ AiEnabled: true, WebSearchEnabled: false })).toBe(false);
  });
});
