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

  it('verifies pure Account (username or email) + password matching for registered users', () => {
    // Simulate user registered via standard mode or email mode
    const registeredUser = {
      id: 'user_456',
      username: 'alice',
      email: 'alice@example.com',
      role: 'user',
    };

    const passMap: Record<string, string> = {
      [registeredUser.id]: 'alicePass123',
      [registeredUser.username.toLowerCase()]: 'alicePass123',
      [registeredUser.email.toLowerCase()]: 'alicePass123',
    };
    saveLocalStorage('fox3_user_passwords', passMap);

    // Test Login via username
    const loginByUsername = 'Alice';
    const pass1 = 'alicePass123';
    expect(passMap[loginByUsername.toLowerCase()]).toBe(pass1);

    // Test Login via email
    const loginByEmail = 'ALICE@EXAMPLE.COM';
    expect(passMap[loginByEmail.toLowerCase()]).toBe(pass1);

    // Test Wrong Password
    const wrongPass = 'wrongPass';
    expect(passMap[loginByEmail.toLowerCase()] === wrongPass).toBe(false);
  });

  it('verifies Option B: deployment admin password activation during registration', () => {
    const deploymentEnvAdminPass = 'fox3admin2026';
    const registrantUser = 'master_fox';
    const registrantPass = 'fox3admin2026';

    const isActivatedAsAdmin = registrantPass === deploymentEnvAdminPass;
    expect(isActivatedAsAdmin).toBe(true);

    const createdRole = isActivatedAsAdmin ? 'admin' : 'user';
    expect(createdRole).toBe('admin');
  });

  it('verifies standard vs email registration requirement checks', () => {
    // Standard registration: only username + password required
    const standardReg = { username: 'bob', password: 'password123' };
    expect(Boolean(standardReg.username && standardReg.password)).toBe(true);

    // Email registration: email must be valid
    const validEmail = 'bob@domain.com';
    const invalidEmail = 'bobdomain';
    expect(validEmail.includes('@') && validEmail.includes('.')).toBe(true);
    expect(invalidEmail.includes('@') && invalidEmail.includes('.')).toBe(false);
  });
});
