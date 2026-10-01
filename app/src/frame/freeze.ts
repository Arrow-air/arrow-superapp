import { computed, ref } from 'vue';
import { LATER, NEXT } from '../modules/threads/data';
import { freezeAt, state } from '../modules/threads/store';

// The design freeze for the version under discussion, as one clock for the
// whole app (from Gavin's app-frame). Until it, contributors shape the next
// version; from it, new threads go to the version after, and open ones get
// settled, deferred or declined before a lead records the freeze. The date is
// the one a lead sets on the Dev Kit v1.1 page; with none set there is no clock.

const now = ref(Date.now());
let timer: ReturnType<typeof setTimeout> | undefined;
function tick() {
  now.value = Date.now();
  const at = freezeAt();
  const left = at ? at.getTime() - now.value : -1;
  // Seconds only matter in the last day; otherwise a slow tick is plenty.
  timer = setTimeout(tick, left > 0 && left < 86_400_000 ? 1000 : 30_000);
}

/** Time left to the freeze, how to show it, and how urgent it is. */
export function useFreeze() {
  if (!timer) tick();
  const at = computed(() => freezeAt());
  /** Is there a freeze to show at all: a date set, or a freeze recorded. */
  const active = computed(() => !!at.value || !!state.release.frozenAt);
  const left = computed(() => (at.value ? Math.max(0, at.value.getTime() - now.value) : 0));
  const frozen = computed(() => !!state.release.frozenAt || (!!at.value && left.value === 0));
  const label = computed(() => {
    const s = Math.floor(left.value / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s % 60}s`;
  });
  /** calm, soon (under 14 days), urgent (under 48 hours), frozen. */
  const level = computed(() => {
    const days = left.value / 86_400_000;
    return frozen.value ? 'frozen' : days < 2 ? 'urgent' : days < 14 ? 'soon' : 'calm';
  });
  const when = computed(() => (at.value ? at.value.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : ''));
  return { active, at, left, frozen, label, level, when, version: NEXT, next: LATER };
}
