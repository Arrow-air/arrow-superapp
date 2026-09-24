export function timeAgo(iso: string, now: Date = new Date()): string {
  const s = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export const tokens = (n: number) => n.toLocaleString('en-US');

export function parseTags(input: string): string[] {
  return [...new Set(input.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

/** A short human title for a position: its first markdown heading, else its first line. */
export function positionTitle(body: string, max = 70): string {
  const lines = (body ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  const heading = lines.find((l) => /^#{1,6}\s+\S/.test(l));
  const raw = (heading ?? lines.find((l) => !/^#{1,6}\s*$/.test(l)) ?? '')
    .replace(/^#{1,6}(\s+|$)/, '')
    .replace(/^[-*>]\s+/, '')
    .replace(/[*_`]/g, '')
    .trim();
  return raw.length > max ? raw.slice(0, max - 1).trimEnd() + '…' : raw || 'Untitled position';
}
