export const norm = (s) => String(s ?? "").toLowerCase();

// Stable short id for progress tracking (survives reordering of content).
export function hashId(text) {
  let h = 5381;
  const s = String(text);
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// All whitespace-separated terms must appear somewhere in the haystack.
export function matches(haystack, query) {
  const q = norm(query).trim();
  if (!q) return true;
  const h = norm(haystack);
  return q.split(/\s+/).every((t) => h.includes(t));
}

// "20–25%" → { lo: 20, hi: 25, mid: 22.5 }
export function parseWeight(w) {
  const nums = String(w).match(/\d+/g)?.map(Number) || [0];
  const lo = nums[0];
  const hi = nums[1] ?? lo;
  return { lo, hi, mid: (lo + hi) / 2 };
}

export const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
