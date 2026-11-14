// Keep this aligned with the Pages Functions implementation. Cloudflare Workers
// Web Crypto rejects PBKDF2 iteration counts above 100,000.
const ITERATIONS = 100_000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256);
  return `pbkdf2$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(new Uint8Array(bits))}`;
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2$')) return stored === password;
  try {
    const [, rounds, saltValue, expectedValue] = stored.split('$');
    const salt = fromBase64Url(saltValue);
    const saltBuffer = new ArrayBuffer(salt.byteLength);
    new Uint8Array(saltBuffer).set(salt);
    const expected = fromBase64Url(expectedValue);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBuffer, iterations: Number(rounds), hash: 'SHA-256' }, key, expected.length * 8));
    if (bits.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}
