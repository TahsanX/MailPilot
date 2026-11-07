const nf = new Intl.NumberFormat("en-US");

export function formatNumber(n) {
  return n == null || Number.isNaN(n) ? "—" : nf.format(n);
}

export function formatDuration(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatShortDay(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export function formatFileSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function hourLabel(h) {
  const suffix = h < 12 ? "am" : "pm";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${suffix}`;
}

/**
 * Largest remainder method so rounded percentages add up to exactly 100.
 * items: [{ key, count }] -> [{ key, count, percent }]
 */
export function withPercentages(items) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (total === 0) return items.map((i) => ({ ...i, percent: 0 }));
  const raw = items.map((i) => (i.count / total) * 100);
  const floors = raw.map(Math.floor);
  let remainder = 100 - floors.reduce((s, n) => s + n, 0);
  const order = raw
    .map((r, idx) => ({ idx, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (const { idx } of order) {
    if (remainder <= 0) break;
    floors[idx] += 1;
    remainder -= 1;
  }
  return items.map((i, idx) => ({ ...i, percent: floors[idx] }));
}

export function gmailThreadUrl(threadId) {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(threadId)}`;
}
