import { computed, ref } from 'vue';
import { freezeAt, releaseOf } from '../modules/threads/store';
import { clockById, clocksOf, type Clock } from '../projects/plans';
import { variantById } from '../projects/longshot/variants';
import { currentProject } from './nav';
import { useWorkspace } from './useWorkspace';

// The design freeze for a version under discussion, as a clock (from Gavin's
// app-frame). Until it, contributors shape the next version; from it, new
// threads go to the version after, and open ones get settled, deferred or
// declined before a lead records the freeze. A lead sets the date on the
// clock's page (Dev Kit v1.1 for Quiver); with none set there is no clock.
// A project can run several (Longshot: one per variant, and the BMS's): a
// clock's page and a variant's page show their own, anywhere else shows the
// one that freezes soonest.

const now = ref(Date.now());
let timer: ReturnType<typeof setTimeout> | undefined;
function tick() {
  now.value = Date.now();
  const left = clocksOf(currentProject.value).map((c) => (freezeAt(c)?.getTime() ?? 0) - now.value).filter((l) => l > 0);
  // Seconds only matter in the last day; otherwise a slow tick is plenty.
  timer = setTimeout(tick, left.some((l) => l < 86_400_000) ? 1000 : 30_000);
}

/** The clock a page is about: its own (a clock's page, a variant's), else the next to freeze, else the one the project leads with. */
function clockOn(project: string, item: string | undefined): Clock {
  const own = clockById(item) ?? clockById(variantById(item)?.clock);
  if (own?.project === project) return own;
  const clocks = clocksOf(project);
  const upcoming = clocks.filter((c) => !releaseOf(c).frozenAt && (freezeAt(c)?.getTime() ?? 0) > now.value);
  const frozen = clocks.filter((c) => releaseOf(c).frozenAt || (freezeAt(c)?.getTime() ?? Infinity) <= now.value);
  return upcoming.sort((a, b) => freezeAt(a)!.getTime() - freezeAt(b)!.getTime())[0] ?? frozen[0] ?? clocks[0];
}

/** One clock's freeze: time left, how to show it, and how urgent it is. */
export function freezeOf(clock: Clock) {
  const at = freezeAt(clock);
  const frozenAt = releaseOf(clock).frozenAt;
  const left = at ? Math.max(0, at.getTime() - now.value) : 0;
  const frozen = !!frozenAt || (!!at && left === 0);
  const s = Math.floor(left / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  const days = left / 86_400_000;
  return {
    /** Is there a freeze to show at all: a date set, or a freeze recorded. */
    active: !!at || !!frozenAt,
    at,
    left,
    frozen,
    label: d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`,
    /** calm, soon (under 14 days), urgent (under 48 hours), frozen. */
    level: frozen ? 'frozen' : days < 2 ? 'urgent' : days < 14 ? 'soon' : 'calm',
    when: at ? at.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC' : '',
  };
}

/** The freeze for a clock: the one given, else the one the page on screen is about. */
export function useFreeze(which?: () => Clock | undefined) {
  if (!timer) tick();
  const { item } = useWorkspace();
  const clock = computed(() => which?.() ?? clockOn(currentProject.value, item.value?.id));
  const f = computed(() => freezeOf(clock.value));
  return {
    clock,
    active: computed(() => f.value.active),
    at: computed(() => f.value.at),
    left: computed(() => f.value.left),
    frozen: computed(() => f.value.frozen),
    label: computed(() => f.value.label),
    level: computed(() => f.value.level),
    when: computed(() => f.value.when),
    /** The version under discussion and the one after it, as shown. */
    get version() { return clock.value.label; },
    get next() { return clock.value.laterLabel; },
    /** Its page. */
    get path() { return clock.value.path; },
  };
}
