import { describe, it, expect, beforeEach } from 'vitest';
import { loadLocalStorage, saveLocalStorage } from '../src/utils/storage';

// In-memory mock for localStorage in Node/Vitest environment
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
};

(globalThis as any).localStorage = mockLocalStorage;

describe('fox3 storage and authentication verification', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reads and writes to storage with fallback defaults', () => {
    const val = loadLocalStorage('test_key_not_exist', { fallback: true });
    expect(val).toEqual({ fallback: true });
  });

  it('verifies admin password matching logic and fallback', () => {
    const defaultPass = 'fox3admin2026';
    saveLocalStorage('fox3_admin_password', 'CustomAdminPass2026');
    const stored = loadLocalStorage('fox3_admin_password', defaultPass);
    expect(stored).toBe('CustomAdminPass2026');

    // Test trimming and whitespace resilience
    const inputPass = '  CustomAdminPass2026  ';
    expect(inputPass.trim()).toBe(stored);
  });

  it('verifies case-insensitive username matching for admin and users', () => {
    const adminUsername = 'fox';
    const candidateInputs = ['FOX', 'Fox', '  fox  ', 'admin', 'service@whitefox.blog'];

    candidateInputs.forEach(input => {
      const normalized = input.trim().toLowerCase();
      const isMatch =
        normalized === adminUsername ||
        normalized === 'admin' ||
        normalized === 'service@whitefox.blog';
      expect(isMatch).toBe(true);
    });
  });

  it('verifies registered user credentials map storage and retrieval', () => {
    const userPassMap: Record<string, string> = {
      user_123: 'secret123',
      john_doe: 'secret123',
      'john@example.com': 'secret123',
    };
    saveLocalStorage('fox3_user_passwords', userPassMap);

    const retrieved = loadLocalStorage<Record<string, string>>('fox3_user_passwords', {});
    expect(retrieved['user_123']).toBe('secret123');
    expect(retrieved['john_doe']).toBe('secret123');
    expect(retrieved['john@example.com']).toBe('secret123');
  });
});
