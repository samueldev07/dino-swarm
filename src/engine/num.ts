const SUFFIX = ['', 'K', 'M', 'B', 'T', 'aa', 'bb', 'cc', 'dd', 'ee', 'ff'];

/** 1234 -> "1.23K". Idle games live or die on readable big numbers. */
export function fmt(n: number): string {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toString();
  let tier = 0;
  let v = n;
  while (v >= 1000 && tier < SUFFIX.length - 1) {
    v /= 1000;
    tier++;
  }
  const digits = v < 10 ? 2 : v < 100 ? 1 : 0;
  return v.toFixed(digits) + SUFFIX[tier];
}

/** Seconds -> "2h 14m" / "47s", for offline-earnings copy. */
export function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ' + (m % 60) + 'm';
  return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
}
