// Your Arrow's pieces that aren't layout: the greeting, the hello drafted
// from someone's answers, the welcome call, and the getting-started ticks
// only this browser knows about.
import { ref, watch } from 'vue';
import type { Person } from '../../lib/registry';
import { listing } from './taxonomy';

export const DISCORD_INVITE = 'https://discord.com/invite/arrow';

/** The next welcome call, shown on Your Arrow and the done screen when set.
 * Null for now: phase 4 schedules them (30 minutes, a rotating host, anyone
 * new; coming to one gives the Member role). */
export const WELCOME_CALL: { label: string; detail: string; url?: string } | null = null;

export function greeting(at = new Date()) {
  const h = at.getHours();
  return h >= 5 && h < 12 ? 'Morning' : h >= 12 && h < 17 ? 'Afternoon' : 'Evening';
}
export const firstName = (name: string) => (name === 'You' ? '' : name.trim().split(/\s+/)[0] ?? '');

const lower = (s: string) => (s && !/^[A-Z]{2}/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const sentence = (s: string) => { const t = s.trim().replace(/\s+/g, ' '); return t && !/[.!?]$/.test(t) ? `${t}.` : t; };

/** A hello for #introductions, from what they said. Theirs to edit. */
export function helloDraft(me: Person): string {
  const pr = me.profile;
  const first = firstName(me.name);
  const where = me.city || me.country;
  const lines = [`Hi all, I'm ${first || 'new here'}${first && where ? ` from ${where}` : ''}.`];
  if (pr?.wants_to_build) lines.push(sentence(`I'd like to build ${lower(pr.wants_to_build)}`));
  const can = (pr?.can ?? []).slice(0, 3).map(lower);
  const learn = (pr?.learn ?? []).slice(0, 2).map(lower);
  if (can.length && learn.length) lines.push(`I do ${listing(can)}, and I'm learning ${listing(learn)}.`);
  else if (can.length) lines.push(`I do ${listing(can)}.`);
  else if (learn.length) lines.push(`I'm learning ${listing(learn)}.`);
  lines.push('Happy to help where that fits.');
  return lines.join(' ');
}

/** A tick someone gives themselves (they posted their hello), kept in this browser. */
export function useTick(name: string) {
  const key = `superapp:you.${name}`;
  const read = () => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
  const on = ref(read());
  watch(on, (v) => { try { if (v) localStorage.setItem(key, '1'); else localStorage.removeItem(key); } catch { /* storage unavailable */ } });
  return on;
}
