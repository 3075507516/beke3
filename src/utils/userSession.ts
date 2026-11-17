const USER_SESSION_KEY = 'fox3_user_session';

export function getUserSessionToken(): string {
  try { return localStorage.getItem(USER_SESSION_KEY) || ''; } catch { return ''; }
}

export function setUserSessionToken(token: string): void {
  try { localStorage.setItem(USER_SESSION_KEY, token); } catch {}
}

export function clearUserSessionToken(): void {
  try { localStorage.removeItem(USER_SESSION_KEY); } catch {}
}
