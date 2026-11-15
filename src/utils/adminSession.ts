const ADMIN_SESSION_KEY = 'fox3_admin_session';

export function getAdminSessionToken(): string {
  try {
    const persisted = localStorage.getItem(ADMIN_SESSION_KEY);
    if (persisted) return persisted;
    // One-time upgrade path for sessions created by earlier releases.
    const legacy = sessionStorage.getItem(ADMIN_SESSION_KEY) || '';
    if (legacy) {
      localStorage.setItem(ADMIN_SESSION_KEY, legacy);
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
    return legacy;
  } catch {
    try { return sessionStorage.getItem(ADMIN_SESSION_KEY) || ''; } catch { return ''; }
  }
}

export function setAdminSessionToken(token: string): void {
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, token);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    try { sessionStorage.setItem(ADMIN_SESSION_KEY, token); } catch {}
  }
}

export function clearAdminSessionToken(): void {
  try { localStorage.removeItem(ADMIN_SESSION_KEY); } catch {}
  try { sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch {}
}
