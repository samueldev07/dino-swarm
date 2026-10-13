/**
 * localStorage wrapper that never throws. Private-mode Safari, blocked
 * site data and quota errors all surface as "no save", which the game
 * treats as a fresh start rather than a crash.
 */
export function loadJSON<T>(key: string, version: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: number; d?: T };
    if (parsed?.v !== version || parsed.d == null) return null;
    return parsed.d;
  } catch {
    return null;
  }
}

export function saveJSON<T>(key: string, version: number, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ v: version, d: data }));
  } catch {
    /* out of quota or storage disabled -- play on, just without a save */
  }
}

export function clearSave(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
