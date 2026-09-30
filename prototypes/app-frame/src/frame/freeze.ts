import { computed, ref } from 'vue';

// The design freeze for the version under discussion. Until it, contributors
// shape the next version; at it, open threads get settled, deferred or declined
// and new ones go to the version after. One clock for the whole app.
//
// PLACEHOLDER date: no PT 2.0 freeze has been set yet. Change it here.
export const FREEZE = {
  version: 'PT 2.0',
  next: 'PT 2.1',
  at: new Date('2026-10-12T18:00:00+01:00'),
};

const now = ref(Date.now());
let timer: ReturnType<typeof setTimeout> | undefined;
function tick() {
  now.value = Date.now();
  const left = FREEZE.at.getTime() - now.value;
  // Seconds only matter in the last day; otherwise a slow tick is plenty.
  timer = setTimeout(tick, left > 0 && left < 86_400_000 ? 1000 : 30_000);
}

/** Time left to the freeze, how to show it, and how urgent it is. */
export function useFreeze() {
  if (!timer) tick();
  const left = computed(() => Math.max(0, FREEZE.at.getTime() - now.value));
  const frozen = computed(() => left.value === 0);
  const label = computed(() => {
    const s = Math.floor(left.value / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s % 60}s`;
  });
  /** calm (30+ days), soon (under 14 days), urgent (under 48 hours). */
  const level = computed(() => {
    const days = left.value / 86_400_000;
    return frozen.value ? 'frozen' : days < 2 ? 'urgent' : days < 14 ? 'soon' : 'calm';
  });
  return { left, frozen, label, level, ...FREEZE };
}
