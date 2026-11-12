<script setup lang="ts">
// #/join: the join wizard, one question a screen. Sign in, then what they
// want to build (in their own words first), what they can do and want to
// learn, the story, place and shop, time, links, and who sees what. Answers
// stay in this browser until saved (modules/registry/join.ts); each step is
// saved once they're signed in, and the last finishes the profile. Someone
// whose profile is finished edits it here, same steps.
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../frame/Icon.vue';
import ProfileCard from '../modules/registry/ProfileCard.vue';
import DisciplineChip from '../modules/registry/DisciplineChip.vue';
import TaxonomyPicker from '../modules/registry/TaxonomyPicker.vue';
import {
  CALL_WINDOWS, EXPERIENCE, HEARD, HOURS, STEP_LABEL, TRAVEL, WHEN,
  blankDraft, cardOf, draftFrom, fieldOfError, fieldsUpTo, following, forgetDraft, forgetPendingJoin, heardFromRef,
  loadDraft, mapDisciplines, mapOf, problemsOf, questionSteps, rememberPendingJoin, resumeStep, stepsFor, storeDraft,
  type JoinDraft, type Problems, type StepId,
} from '../modules/registry/join';
import { matchesFor, type MatchItem } from '../modules/registry/matching';
import { DISCORD_INVITE, WELCOME_CALL, firstName } from '../modules/registry/you';
import { BLURB_MAX, BUILD_OPTIONS, DEMO_ME, LANES, TOOLS, WANTS, myProfile, rememberJoinRef, saveProfile, type BuildOption, type Lane, type Person, type Tool, type Want } from '../lib/registry';
import { remote } from '../lib/backend';
import { say, session, signInWithGitHub } from '../lib/session';
import { state as threadState } from '../modules/threads/store';
import { answers, loadAnswers } from '../modules/guide/store';
import { longshotGuide } from '../projects/longshot/guide';
import type { IconName } from '../frame/icons';
import '../modules/registry/registry.css';

const route = useRoute();
const router = useRouter();

const stored = loadDraft();
const d = reactive<JoinDraft>(stored ?? blankDraft());
const finishedNow = ref(false);
// Once the profile is finished the database has it all; nothing more to keep.
watch(d, () => { if (!finishedNow.value) storeDraft(d); }, { deep: true });

// The demo has no accounts: its sign-in step just carries on as the visitor.
const demoIn = ref(false);
const signedIn = computed(() => (remote ? !!session.userId : demoIn.value));
const userKey = computed(() => (remote ? session.userId : DEMO_ME));
const me = ref<Person | null>(null);
const phase = ref<'loading' | 'ready' | 'error'>('loading');
const loadError = ref('');
const busy = ref(false);
const saveNote = ref('');
const saveError = ref('');
const problems = ref<Problems>({});
const root = ref<HTMLElement>();

const steps = computed(() => stepsFor(d, signedIn.value));
const questions = computed(() => questionSteps(d, signedIn.value));
const qIndex = computed(() => questions.value.indexOf(d.step));
const isFinished = computed(() => !!me.value?.profile?.finished_at);
const hasAnswers = (x: JoinDraft) => !!(x.wants_to_build.trim() || x.lanes.length || x.can.length || x.learn.length || x.story.trim());

// Steps ------------------------------------------------------------------------
/** The step someone may be on: sign-in first, and nothing past the first
 * question until it's answered. */
function allowed(s: StepId): StepId {
  if (!signedIn.value) return 'signin';
  if (s === 'done') return finishedNow.value || isFinished.value ? 'done' : 'visibility';
  const list = steps.value;
  let target = list.includes(s) ? s : list.find((x) => STEP_ORDER.indexOf(x) > STEP_ORDER.indexOf(s)) ?? 'visibility';
  if (target === 'signin') target = 'build';
  if (!d.wants_to_build.trim() && STEP_ORDER.indexOf(target) > STEP_ORDER.indexOf('build')) target = 'build';
  return target;
}
const STEP_ORDER: StepId[] = ['signin', 'build', 'skills', 'story', 'place', 'time', 'links', 'visibility', 'done'];
function go(s: StepId, how: 'push' | 'replace' = 'push') {
  const t = allowed(s);
  problems.value = {};
  saveError.value = '';
  d.step = t;
  if (route.query.step !== t) void router[how]({ path: '/join', query: { step: t } });
  void nextTick(() => {
    root.value?.closest('.slot')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    root.value?.querySelector<HTMLElement>('.wizq')?.focus({ preventScroll: true });
  });
}
// The browser's back and forward buttons move between steps.
watch(() => route.query.step, (q) => {
  if (phase.value !== 'ready' || typeof q !== 'string' || q === d.step) return;
  if (STEP_ORDER.includes(q as StepId)) go(q as StepId, 'replace');
});

// Loading ------------------------------------------------------------------------
async function start() {
  const r = route.query.ref;
  if (typeof r === 'string' && r) {
    rememberJoinRef(r);
    if (!d.heard_from) d.heard_from = heardFromRef(r);
  }
  if (!remote && !demoIn.value) demoIn.value = d.userId === DEMO_ME || !!(await myProfile());
  if (!signedIn.value) {
    phase.value = 'ready';
    go('signin', 'replace');
    return;
  }
  forgetPendingJoin();
  phase.value = 'loading';
  try {
    me.value = await myProfile();
  } catch (e) {
    loadError.value = (e as Error).message;
    phase.value = 'error';
    return;
  }
  // Someone else's answers on this browser are not theirs to carry on.
  if (d.userId && d.userId !== userKey.value) Object.assign(d, blankDraft());
  // Answers in this browser win (they're the newest), unless the profile was
  // finished since, here or on another device.
  const useLocal = hasAnswers(d) && !(isFinished.value && !d.edit);
  if (!useLocal && me.value) {
    const heard = d.heard_from;
    Object.assign(d, draftFrom(me.value, blankDraft()));
    if (!d.heard_from) d.heard_from = heard;
    d.step = d.edit ? 'build' : resumeStep(d);
  }
  d.userId = userKey.value;
  if (!d.name.trim()) d.name = (me.value && me.value.name !== 'You' ? me.value.name : session.member?.display_name) ?? '';
  phase.value = 'ready';
  const q = route.query.step;
  go(typeof q === 'string' && STEP_ORDER.includes(q as StepId) ? (q as StepId) : d.step === 'signin' ? 'build' : d.step, 'replace');
}
onMounted(() => {
  document.title = 'Join · Arrow';
  if (remote && !session.ready) {
    const stop = watch(() => session.ready, (r) => { if (r) { stop(); void start(); } });
  } else void start();
});
// Signed in from this page (email and password in the box), or signed out.
watch(() => [session.userId, session.member?.user_id], ([id, joined], [was]) => {
  if (!remote || !session.ready) return;
  if (id && joined && d.step === 'signin') void start();
  else if (!id && was) { phase.value = 'ready'; go('signin', 'replace'); }
});

// Sign in ------------------------------------------------------------------------
function signIn(how: 'github' | 'email') {
  if (!remote) { demoIn.value = true; void start(); return; }
  // GitHub and email links leave the page; this brings them back to /join.
  rememberPendingJoin();
  storeDraft(d);
  if (how === 'github') {
    busy.value = true;
    void signInWithGitHub().then(({ error }) => { if (error) { busy.value = false; saveError.value = error.message; forgetPendingJoin(); } });
  } else {
    session.signInFor = 'join';
    session.signInOpen = true;
  }
}

// Saving -------------------------------------------------------------------------
const OFFLINE = /failed to fetch|networkerror|load failed|network request failed|fetch failed/i;
async function save(step: StepId, finish: boolean): Promise<boolean> {
  if (remote && !session.member) {
    saveError.value = 'You\'re signed in, but not in the workspace yet, so nothing was saved. Reload the page and try again; your answers are kept in this browser.';
    return false;
  }
  try {
    me.value = await saveProfile(fieldsUpTo(step, d, steps.value), finish);
    saveNote.value = '';
    return true;
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    if (OFFLINE.test(msg)) {
      if (finish) { saveError.value = 'Couldn\'t reach Arrow, so your profile isn\'t saved yet. Your answers are kept in this browser; check your connection and press Finish again.'; return false; }
      saveNote.value = 'Not saved yet: couldn\'t reach Arrow. Your answers are kept in this browser and go with the next step.';
      return true;
    }
    const f = fieldOfError(msg);
    if (f && steps.value.includes(f.step)) {
      if (f.step !== d.step) go(f.step);
      problems.value = { [f.field]: msg };
      // Not every field has a place for a message; then it goes by the buttons.
      void nextTick(() => { if (!root.value?.querySelector('section[data-step] .err')) saveError.value = msg; });
    } else saveError.value = msg;
    return false;
  }
}
async function next() {
  if (busy.value) return;
  const p = problemsOf(d.step, d);
  if (Object.keys(p).length) {
    problems.value = p;
    void nextTick(() => root.value?.querySelector<HTMLElement>('[aria-invalid="true"], .err')?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    return;
  }
  const last = d.step === 'visibility';
  busy.value = true;
  const ok = await save(d.step, last);
  busy.value = false;
  if (!ok) return;
  if (!last) { const list = steps.value; go(list[list.indexOf(d.step) + 1] ?? 'visibility'); return; }
  const editing = d.edit;
  forgetDraft();
  finishedNow.value = true;
  if (editing) { say('Profile saved.'); void router.push('/you'); return; }
  go('done');
}
function back() {
  const list = steps.value;
  const i = list.indexOf(d.step);
  if (i > 0 && list[i - 1] !== 'signin') go(list[i - 1]);
}
const canBack = computed(() => { const i = steps.value.indexOf(d.step); return i > 0 && steps.value[i - 1] !== 'signin'; });

// Answers ------------------------------------------------------------------------
const LANE_ICON: Record<Lane, IconName> = { engineer: 'ruler', hardware: 'wrench', fly: 'plane', code: 'chip', story: 'megaphone', dao: 'vote', follow: 'eye' };
const LANE_HINT: Record<Lane, string> = {
  engineer: 'CAD, electronics, aero, software for the aircraft', hardware: 'Print, machine, solder or assemble real parts and kits',
  fly: 'Flight tests, logs, maintenance, missions', code: 'Firmware, QuiverHub, the SDK, tools like this one', story: 'Docs, video, design, community',
  dao: 'Proposals, treasury, tokenomics', follow: 'No work questions. Updates, votes, cheering',
};
const lanes = Object.keys(LANES) as Lane[];
function toggleLane(l: Lane) {
  if (d.lanes.includes(l)) d.lanes = d.lanes.filter((x) => x !== l);
  // Just following is on its own: it skips the work questions.
  else d.lanes = l === 'follow' ? ['follow'] : [...d.lanes.filter((x) => x !== 'follow'), l];
}
const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const tools = Object.entries(TOOLS) as [Tool, string][];
const buildOptions = Object.entries(BUILD_OPTIONS) as [BuildOption, string][];
const wants = Object.entries(WANTS) as [Want, string][];
function toggleBuild(b: BuildOption) { d.build = toggleIn(d.build, b); if (d.build.length) d.buildNotNow = false; }
function buildNotNow() { d.buildNotNow = !d.buildNotNow; if (d.buildNotNow) d.build = []; }
const hoursOptions = computed(() => (d.hours && !HOURS.includes(d.hours) ? [...HOURS, d.hours] : HOURS));
const travelOptions = computed(() => (d.travel && !TRAVEL.includes(d.travel) ? [...TRAVEL, d.travel] : TRAVEL));
const mapChoice = computed(() => (!d.mapOn ? 'off' : d.mapAt));
function setMap(v: 'city' | 'country' | 'off') { if (v === 'off') d.mapOn = false; else { d.mapOn = true; d.mapAt = v; } }
const zones = (() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return [] as string[]; } })();
const tzOptions = computed(() => (zones.includes(d.tz) || !d.tz ? zones : [d.tz, ...zones]));
const proven = computed(() => me.value?.github ?? session.member?.github ?? null);
const fromRef = computed(() => { try { return localStorage.getItem('superapp:join-ref') ?? me.value?.ref ?? ''; } catch { return ''; } });
function addWork() { if (d.work.length < 9) d.work = [...d.work, '']; }
const blurbLeft = computed(() => BLURB_MAX - d.blurb.trim().length);
const card = computed(() => cardOf(d, { github: proven.value, joined: (me.value?.claimed_at ?? undefined)?.slice(0, 7) }));
const mapPicks = computed(() => mapDisciplines(d));
function toggleMapDisc(x: string) {
  const cur = mapPicks.value;
  if (cur.includes(x)) { d.map_disciplines = cur.filter((y) => y !== x); d.mapPicked = true; return; }
  if (cur.length >= 3) { problems.value = { ...problems.value, map_disciplines: 'The card shows 3 at most. Take one off first.' }; return; }
  d.map_disciplines = [...cur, x];
  d.mapPicked = true;
  problems.value = { ...problems.value, map_disciplines: undefined };
}
const pickable = computed(() => [...d.can, ...d.learn.filter((x) => !d.can.includes(x))]);
// Any change to a field clears what was wrong with it.
watch(d, () => {
  if (!Object.keys(problems.value).length) return;
  const now = problemsOf(d.step, d);
  problems.value = Object.fromEntries(Object.entries(problems.value).filter(([k, v]) => v && now[k]));
}, { deep: true });

// Done ----------------------------------------------------------------------------
const doneMatches = ref<MatchItem[]>([]);
watch(() => d.step, async (s) => {
  if (s !== 'done') return;
  await loadAnswers(longshotGuide.project, longshotGuide.id);
  const pr = me.value?.profile;
  if (!pr) return;
  // The guide first, as somewhere to do one real thing, then a thread.
  const all = matchesFor(pr, threadState.threads, longshotGuide.steps, (q) => answers.list.some((a) => a.question === q));
  const first = all.find((m) => m.kind === 'guide') ?? all[0];
  doneMatches.value = [first, all.find((m) => m !== first && m.kind !== first?.kind) ?? all.find((m) => m !== first)].filter((m): m is MatchItem => !!m);
});
const doneName = computed(() => firstName(me.value?.name ?? d.name));
</script>

<template>
  <div ref="root" class="rg join">
    <div class="wizcard">
      <p v-if="phase === 'loading'" class="wizsub" role="status">Loading your profile…</p>
      <div v-else-if="phase === 'error'" class="loaderr">
        <p class="wizq" tabindex="-1">Couldn't load your profile</p>
        <p class="wizsub">{{ loadError }}. Your answers in this browser are safe.</p>
        <div class="center"><button class="btn primary" type="button" @click="start">Try again</button></div>
      </div>
      <template v-else>
        <div v-if="qIndex >= 0" class="wizprog" aria-hidden="true">
          <span>{{ qIndex + 1 }} / {{ questions.length }}</span>
          <div class="bar"><i :style="{ width: `${((qIndex + 1) / questions.length) * 100}%` }"></i></div>
          <span>{{ STEP_LABEL[d.step] }}</span>
        </div>
        <div v-else class="spacer"></div>

        <!-- Sign in -->
        <section v-if="d.step === 'signin'" data-step="signin">
          <h1 class="wizq" tabindex="-1">Join Arrow</h1>
          <p class="wizsub">Tell us what you want to build and what you can do. Three minutes, one question at a time. A person on the core team reads every profile.</p>
          <div class="signin">
            <button class="btn lg discord" type="button" disabled aria-describedby="discord-soon"><Icon name="discord" :size="16" /> Continue with Discord <span id="discord-soon" class="soon">coming soon</span></button>
            <button class="btn lg" type="button" :disabled="busy" @click="signIn('github')"><Icon name="github" :size="16" /> Continue with GitHub</button>
            <button class="btn lg" type="button" :disabled="busy" @click="signIn('email')"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg> Continue with email</button>
            <p class="why center">One Arrow account for this app, flights.arrowair.com and the forum.</p>
            <p v-if="!remote" class="why center">Demo: there are no accounts here, so either button carries on as the demo visitor and your answers stay in this browser.</p>
            <p v-if="saveError" class="err center" role="alert">{{ saveError }}</p>
          </div>
        </section>

        <!-- What do you want to build -->
        <section v-else-if="d.step === 'build'" data-step="build">
          <h1 class="wizq" tabindex="-1">What do you want to build?</h1>
          <p class="wizsub">In your own words, a sentence or two. Then pick what fits you.</p>
          <div class="wtb">
            <textarea id="wtb" v-model="d.wants_to_build" class="input big" rows="3" maxlength="600" aria-label="What do you want to build?"
              placeholder="A Longshot pack for my own Quiver, a better wing for Spearhead, flight logs that make sense…"
              :aria-invalid="!!problems.wants_to_build" aria-describedby="wtb-err"></textarea>
            <p v-if="problems.wants_to_build" id="wtb-err" class="err" role="alert">{{ problems.wants_to_build }}</p>
          </div>
          <div class="opts" role="group" aria-label="What fits you">
            <button v-for="l in lanes" :key="l" type="button" class="opt" role="checkbox" :aria-checked="d.lanes.includes(l)" :data-lane="l" @click="toggleLane(l)">
              <span class="ic"><Icon :name="LANE_ICON[l]" :size="16" /></span>
              <span class="otext"><b>{{ LANES[l] }}</b><span>{{ LANE_HINT[l] }}</span></span>
              <span class="box"><svg v-if="d.lanes.includes(l)" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></span>
            </button>
          </div>
          <p v-if="following(d)" class="why center">Just following along: we'll skip the work questions. You can add them any time from your dashboard.</p>
        </section>

        <!-- Can do / want to learn -->
        <section v-else-if="d.step === 'skills'" data-step="skills">
          <h1 class="wizq" tabindex="-1">What can you do, and what do you want to learn?</h1>
          <p class="wizsub">Tap once for can do, twice for want to learn. Arrow's discipline list, the same one bounties and the map use.</p>
          <div class="legend" aria-hidden="true"><DisciplineChip name="Electrical" /> <span>can do</span> <DisciplineChip name="Firmware" kind="learn" /> <span>learning</span></div>
          <TaxonomyPicker v-model:can="d.can" v-model:learn="d.learn" label="Can do and want to learn" />
          <p class="center faint small" data-counts>{{ d.can.length }} can do · {{ d.learn.length }} learning</p>
          <p v-if="problems.can" class="err center" role="alert">{{ problems.can }}</p>
          <div class="field narrow">
            <span id="exp-l" class="label">How much experience, across the ones you can do?</span>
            <div class="seg" role="radiogroup" aria-labelledby="exp-l">
              <button v-for="x in EXPERIENCE" :key="x" type="button" role="radio" :aria-checked="d.experience === x" @click="d.experience = d.experience === x ? '' : x">{{ x }}</button>
            </div>
          </div>
        </section>

        <!-- The story -->
        <section v-else-if="d.step === 'story'" data-step="story">
          <h1 class="wizq" tabindex="-1">Tell us about something you've built, and what went wrong along the way.</h1>
          <p class="wizsub">The one question we really read. Specifics beat polish.</p>
          <div class="storybox">
            <div>
              <textarea v-model="d.story" class="input" rows="9" aria-label="Something you've built, and what went wrong" :aria-invalid="!!problems.story"
                placeholder="Name the thing, what broke, and what you changed."></textarea>
              <div class="row"><span class="why">Optional, but it's what we read first.</span><span class="count" :class="{ over: d.story.trim().length > 4000 }">{{ d.story.trim().length }} / 4000</span></div>
              <p v-if="problems.story" class="err" role="alert">{{ problems.story }}</p>
            </div>
            <div class="hint"><b>Why this question</b>A story with specifics is easy to follow up on and hard to fake. Name the thing, what broke, and what you changed.<br /><br /><b>Using an AI?</b>Fine. Edit it until it sounds like you. We weigh links and real work far more than polish.</div>
          </div>
        </section>

        <!-- Place and shop -->
        <section v-else-if="d.step === 'place'" data-step="place">
          <h1 class="wizq" tabindex="-1">Where are you, and what can you build with?</h1>
          <p class="wizsub">This is how we find people for builds near them.</p>
          <div class="formgrid">
            <div><label class="label" for="city">City (optional)</label><input id="city" v-model="d.city" class="input" autocomplete="address-level2" :aria-invalid="!!problems.city" /><p v-if="problems.city" class="err">{{ problems.city }}</p></div>
            <div><label class="label" for="country">Country</label><input id="country" v-model="d.country" class="input" autocomplete="country-name" :aria-invalid="!!problems.country" /><p v-if="problems.country" class="err">{{ problems.country }}</p></div>
            <div class="wide">
              <span id="map-l" class="label">On the map, show</span>
              <div class="seg" role="radiogroup" aria-labelledby="map-l">
                <button type="button" role="radio" :aria-checked="mapChoice === 'city'" @click="setMap('city')">My city</button>
                <button type="button" role="radio" :aria-checked="mapChoice === 'country'" @click="setMap('country')">Country only</button>
                <button type="button" role="radio" :aria-checked="mapChoice === 'off'" @click="setMap('off')">Don't show me</button>
              </div>
              <p v-if="d.mapOn && d.mapAt === 'city' && !d.city.trim()" class="why">No city: the map shows your country only.</p>
            </div>
            <div class="wide">
              <span id="tools-l" class="label">Tools you can use</span>
              <div class="picks" role="group" aria-labelledby="tools-l">
                <button v-for="[k, v] in tools" :key="k" type="button" class="pick" :aria-pressed="d.tools.includes(k)" :data-tool="k" @click="d.tools = toggleIn(d.tools, k)">{{ v }}</button>
              </div>
            </div>
            <div class="wide">
              <span id="build-l" class="label">Would you build Arrow hardware?</span>
              <div class="picks" role="group" aria-labelledby="build-l">
                <button v-for="[k, v] in buildOptions" :key="k" type="button" class="pick" :aria-pressed="d.build.includes(k)" @click="toggleBuild(k)">{{ v }}</button>
                <button type="button" class="pick" :aria-pressed="d.buildNotNow" @click="buildNotNow">Not now</button>
              </div>
            </div>
            <div class="wide">
              <span id="travel-l" class="label">For the right build, you'd travel</span>
              <div class="seg" role="radiogroup" aria-labelledby="travel-l">
                <button v-for="x in travelOptions" :key="x" type="button" role="radio" :aria-checked="d.travel === x" @click="d.travel = d.travel === x ? '' : x">{{ x }}</button>
              </div>
            </div>
          </div>
        </section>

        <!-- Time -->
        <section v-else-if="d.step === 'time'" data-step="time">
          <h1 class="wizq" tabindex="-1">How much time, and what do you want out of it?</h1>
          <p class="wizsub">Be honest. We only suggest work that fits.</p>
          <div class="formgrid">
            <div class="wide">
              <span id="hours-l" class="label">Time</span>
              <div class="picks" role="radiogroup" aria-labelledby="hours-l">
                <button v-for="x in hoursOptions" :key="x" type="button" class="pick" role="radio" :aria-checked="d.hours === x" @click="d.hours = d.hours === x ? '' : x">{{ x }}</button>
              </div>
            </div>
            <div class="wide">
              <span id="when-l" class="label">When</span>
              <div class="picks" role="group" aria-labelledby="when-l">
                <button v-for="x in WHEN" :key="x" type="button" class="pick" :aria-pressed="d.when.includes(x)" @click="d.when = toggleIn(d.when, x)">{{ x }}</button>
              </div>
            </div>
            <div>
              <label class="label" for="tz">Time zone</label>
              <select v-if="tzOptions.length" id="tz" v-model="d.tz" class="input" :aria-invalid="!!problems.tz"><option v-for="z in tzOptions" :key="z" :value="z">{{ z.replace(/_/g, ' ') }}</option></select>
              <input v-else id="tz" v-model="d.tz" class="input" :aria-invalid="!!problems.tz" />
              <p v-if="problems.tz" class="err">{{ problems.tz }}</p>
              <p v-else class="why">From your browser. Change it if that's wrong.</p>
            </div>
            <div class="hide-sm"></div>
            <div class="wide">
              <span id="wants-l" class="label">What do you want out of it?</span>
              <div class="picks" role="group" aria-labelledby="wants-l">
                <button v-for="[k, v] in wants" :key="k" type="button" class="pick" :aria-pressed="d.wants.includes(k)" @click="d.wants = toggleIn(d.wants, k)">{{ v }}</button>
              </div>
            </div>
            <div class="wide">
              <label class="label" for="never">Anything you never want to be asked to do? (optional)</label>
              <input id="never" v-model="d.never" class="input" placeholder="e.g. social media, cold outreach" :aria-invalid="!!problems.never" />
              <p v-if="problems.never" class="err">{{ problems.never }}</p>
            </div>
          </div>
        </section>

        <!-- Links -->
        <section v-else-if="d.step === 'links'" data-step="links">
          <h1 class="wizq" tabindex="-1">Where can we see your work?</h1>
          <p class="wizsub">Links carry more weight than anything you write about yourself.</p>
          <div class="formgrid">
            <div><label class="label" for="discord"><Icon name="discord" :size="13" /> Discord username</label><input id="discord" v-model="d.discord" class="input" placeholder="maya.builds" autocomplete="off" :aria-invalid="!!problems.discord" /><p v-if="problems.discord" class="err">{{ problems.discord }}</p></div>
            <div>
              <label class="label" for="github"><Icon name="github" :size="13" /> GitHub</label>
              <input v-if="proven" id="github" class="input" :value="`${proven} · signed in`" disabled />
              <template v-else><input id="github" v-model="d.github" class="input" placeholder="your-login" autocomplete="off" :aria-invalid="!!problems.github" /><p v-if="problems.github" class="err">{{ problems.github }}</p></template>
            </div>
            <div><label class="label" for="x"><Icon name="x-logo" :size="12" /> X</label><input id="x" v-model="d.x" class="input" placeholder="@handle" autocomplete="off" :aria-invalid="!!problems.x" /><p v-if="problems.x" class="err">{{ problems.x }}</p></div>
            <div><label class="label" for="linkedin">LinkedIn</label><input id="linkedin" v-model="d.linkedin" class="input" placeholder="linkedin.com/in/…" autocomplete="off" :aria-invalid="!!problems.linkedin" /><p v-if="problems.linkedin" class="err">{{ problems.linkedin }}</p></div>
            <div class="wide">
              <label class="label" for="work0">Projects, videos, CAD, a portfolio</label>
              <div class="worklist">
                <template v-for="(_, i) in d.work" :key="i">
                  <input :id="`work${i}`" v-model="d.work[i]" class="input" :aria-label="i ? `Another link ${i + 1}` : undefined" placeholder="youtube.com/watch?v=…, printables.com/@you, github.com/you/project" autocomplete="off" :aria-invalid="!!problems[`work${i}`]" />
                  <p v-if="problems[`work${i}`]" class="err">{{ problems[`work${i}`] }}</p>
                </template>
              </div>
              <button v-if="d.work.length < 9" class="btn sm ghost addlink" type="button" @click="addWork">+ Add another</button>
              <p v-if="problems.work" class="err">{{ problems.work }}</p>
            </div>
            <div class="wide">
              <span id="heard-l" class="label">How did you hear about Arrow?</span>
              <div class="picks" role="radiogroup" aria-labelledby="heard-l">
                <button v-for="x in HEARD" :key="x" type="button" class="pick" role="radio" :aria-checked="d.heard_from === x" @click="d.heard_from = d.heard_from === x ? '' : x">{{ x }}</button>
              </div>
              <p v-if="fromRef && heardFromRef(fromRef) && d.heard_from === heardFromRef(fromRef)" class="why">Filled in from your link ({{ fromRef }}). Change it if that's wrong.</p>
            </div>
          </div>
        </section>

        <!-- Who sees what -->
        <section v-else-if="d.step === 'visibility'" data-step="visibility">
          <h1 class="wizq" tabindex="-1">Last thing: who sees what</h1>
          <p class="wizsub">You can change all of this later, or take yourself off the map.</p>
          <div class="grid2">
            <div>
              <span class="label">Your public card, on the map</span>
              <ProfileCard :card="card" data-card-preview />
              <p class="why">Up to 3 disciplines and {{ BLURB_MAX }} characters, no links: the map's rules.</p>
              <div class="field">
                <label class="label" for="name">Your name</label>
                <input id="name" v-model="d.name" class="input" autocomplete="name" maxlength="90" :aria-invalid="!!problems.name" />
                <p v-if="problems.name" class="err" role="alert">{{ problems.name }}</p>
              </div>
              <div class="field">
                <div class="row"><label class="label" for="blurb">One line about you</label><span class="count" :class="{ over: blurbLeft < 0 }" data-blurb-count>{{ blurbLeft }}</span></div>
                <textarea id="blurb" v-model="d.blurb" class="input" rows="2" placeholder="Utility field tech in Houston. Built a 14S e-bike pack from salvaged cells." :aria-invalid="!!problems.blurb"></textarea>
                <p v-if="problems.blurb" class="err" role="alert">{{ problems.blurb }}</p>
              </div>
              <div v-if="pickable.length" class="field">
                <span id="md-l" class="label">On the card ({{ mapPicks.length }} of 3)</span>
                <div class="picks" role="group" aria-labelledby="md-l">
                  <button v-for="x in pickable" :key="x" type="button" class="pick" :aria-pressed="mapPicks.includes(x)" :data-mapd="x" @click="toggleMapDisc(x)">{{ x }}</button>
                </div>
                <p v-if="problems.map_disciplines" class="err" role="alert">{{ problems.map_disciplines }}</p>
              </div>
            </div>
            <div class="vis">
              <button type="button" class="toggle" role="switch" :aria-checked="d.mapOn" data-toggle="map" @click="d.mapOn = !d.mapOn"><span class="sw"></span><span>Show me on the contributor map</span></button>
              <div v-if="d.mapOn && (!d.country.trim() || problems.country)" class="field sub">
                <label class="label" for="vcountry">Country (the map needs at least this)</label>
                <input id="vcountry" v-model="d.country" class="input" autocomplete="country-name" :aria-invalid="!!problems.country" />
                <p v-if="problems.country" class="err" role="alert">{{ problems.country }}</p>
              </div>
              <button type="button" class="toggle" role="switch" :aria-checked="d.call_ok" data-toggle="call" @click="d.call_ok = !d.call_ok"><span class="sw"></span><span>I'm up for a 20-minute intro call with the core team</span></button>
              <div v-if="d.call_ok" class="sub">
                <div class="picks" role="group" aria-label="Times that suit you">
                  <button v-for="x in CALL_WINDOWS" :key="x" type="button" class="pick sm" :aria-pressed="d.call_windows.includes(x)" @click="d.call_windows = toggleIn(d.call_windows, x)">{{ x }}</button>
                </div>
                <p class="why">Your time zone: {{ d.tz.replace(/_/g, ' ') }}.</p>
              </div>
              <div class="callout"><Icon name="eye" :size="14" /><div><b>Members</b> see your full profile: what you want to build, the story, links, tools and time. Everyone else sees only your card, and only if you're on the map.</div></div>
            </div>
          </div>
        </section>

        <!-- Done -->
        <section v-else-if="d.step === 'done'" data-step="done">
          <div class="donehero">
            <div class="ok"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></div>
            <h1 class="wizq" tabindex="-1">You're in{{ doneName ? `, ${doneName}` : '' }}</h1>
            <p class="wizsub">{{ mapOf(d) !== 'off' && me?.map !== 'off' ? 'You\'re on the map. ' : '' }}A person on the core team reads every profile. If there's a fit, Thomas or a project lead will message you on Discord, usually within a week.</p>
          </div>
          <div class="next3">
            <div class="it">
              <span class="k">01</span>
              <div class="grow" v-if="doneMatches[0]"><b>{{ doneMatches[0].title }}</b><span class="muted">{{ doneMatches[0].where }} · {{ doneMatches[0].because.replace(/^because: /, '') }}</span></div>
              <div class="grow" v-else><b>See what's being built</b><span class="muted">Longshot, Arrow's battery pack, at a glance: what's done and what's next.</span></div>
              <RouterLink class="btn sm" :to="doneMatches[0]?.to ?? '/longshot/overview/summary'">Open</RouterLink>
            </div>
            <div class="it">
              <span class="k">02</span>
              <div class="grow"><b>Say hello in #introductions</b><span class="muted">We drafted a hello from your answers. Edit it and post it on Arrow's Discord.</span></div>
              <RouterLink class="btn sm" to="/you">See draft</RouterLink>
            </div>
            <div class="it">
              <span class="k">03</span>
              <template v-if="WELCOME_CALL">
                <div class="grow"><b>{{ WELCOME_CALL.label }}</b><span class="muted">{{ WELCOME_CALL.detail }}</span></div>
                <a v-if="WELCOME_CALL.url" class="btn sm" :href="WELCOME_CALL.url" target="_blank" rel="noopener">Add to calendar</a>
              </template>
              <template v-else-if="doneMatches[1]">
                <div class="grow"><b>{{ doneMatches[1].title }}</b><span class="muted">{{ doneMatches[1].where }} · {{ doneMatches[1].because.replace(/^because: /, '') }}</span></div>
                <RouterLink class="btn sm" :to="doneMatches[1].to">Open</RouterLink>
              </template>
              <template v-else>
                <div class="grow"><b>Come and say hi on Discord</b><span class="muted">Most of Arrow's talk happens there.</span></div>
                <a class="btn sm" :href="DISCORD_INVITE" target="_blank" rel="noopener">Open Discord</a>
              </template>
            </div>
          </div>
          <div class="wiznav">
            <span class="skip"></span>
            <RouterLink class="btn primary lg" to="/you">Go to your dashboard</RouterLink>
          </div>
        </section>

        <div v-if="d.step !== 'signin' && d.step !== 'done'" class="wiznav">
          <button v-if="canBack" class="btn ghost" type="button" @click="back">Back</button>
          <span class="skip" role="status">
            <span v-if="saveNote" class="note">{{ saveNote }}</span>
            <span v-else-if="d.edit" class="faint">Editing your profile</span>
          </span>
          <button class="btn primary lg" type="button" :disabled="busy" data-next @click="next">{{ d.step === 'visibility' ? (d.edit ? 'Save' : 'Finish') : 'Continue' }}</button>
        </div>
        <p v-if="saveError && d.step !== 'signin'" class="err right" role="alert">{{ saveError }}</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.join { display: flex; flex-direction: column; align-items: center; padding: 20px 16px 40px; }
.wizcard { width: min(720px, 100%); }
.spacer { height: 20px; }
.wizprog { display: flex; align-items: center; gap: 12px; margin-bottom: 26px; color: var(--fg-faint); font: 11px var(--font-mono); }
.wizprog .bar { flex: 1; height: 3px; overflow: hidden; border-radius: 3px; background: var(--slate-a4); }
.wizprog .bar i { display: block; height: 100%; border-radius: 3px; background: var(--indigo-9); transition: width 0.25s; }
.wizq { margin: 0; color: var(--fg); font-size: 26px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; text-align: center; outline: none; }
.wizsub { max-width: 560px; margin: 8px auto 22px; color: var(--fg-muted); font-size: 14px; line-height: 1.5; text-align: center; }
.center { text-align: center; justify-content: center; }
.right { text-align: right; }
.faint { color: var(--fg-faint); }
.small { font-size: var(--text-sm); }
.muted { color: var(--fg-muted); }
.row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-top: 6px; }
.row .label { margin: 0; }
.field { margin-top: 14px; }
.field.narrow { max-width: 560px; margin: 16px auto 0; text-align: center; }
.field.narrow .label { justify-content: center; }
.field.sub, .sub { margin: -4px 0 0 40px; }

.signin { display: grid; gap: 10px; max-width: 380px; margin: 0 auto; }
.signin .why { margin: 4px 0 0; }
.soon { margin-left: 4px; padding: 1px 6px; border-radius: 5px; background: rgb(255 255 255 / 0.2); font: 600 10px/1.5 var(--font-mono); letter-spacing: 0.04em; text-transform: uppercase; }
.rg .btn.discord:disabled { opacity: 0.55; }

.wtb { max-width: 620px; margin: 0 auto 18px; }
.input.big { font-size: 15px; }
.opts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.opt { display: flex; align-items: flex-start; gap: 12px; padding: 14px; border: 1px solid var(--border); border-radius: 12px; background: var(--slate-a2); color: inherit; font: inherit; text-align: left; cursor: pointer; }
.opt:hover { border-color: var(--slate-a7); }
.opt[aria-checked='true'] { border-color: var(--indigo-9); background: var(--indigo-a3); }
.opt .ic { display: grid; place-items: center; width: 34px; height: 34px; flex: none; border-radius: 9px; background: var(--slate-a3); color: var(--fg-2); }
.opt[aria-checked='true'] .ic { background: var(--indigo-9); color: #fff; }
.otext { flex: 1; min-width: 0; }
.opt b { display: block; color: var(--fg); font-size: 13.5px; font-weight: 500; }
.otext span { color: var(--fg-muted); font-size: var(--text-base); line-height: 1.45; }
.opt .box { display: grid; place-items: center; width: 18px; height: 18px; flex: none; border: 1.5px solid var(--slate-7); border-radius: 5px; color: #fff; }
.opt[aria-checked='true'] .box { border-color: var(--indigo-9); background: var(--indigo-9); }

.legend { display: flex; align-items: center; justify-content: center; gap: 6px; margin: -8px 0 16px; color: var(--fg-muted); font-size: var(--text-sm); }
.legend span:not(.dchip) { margin-right: 8px; }
[data-counts] { margin: 4px 0 0; }

.storybox { display: grid; grid-template-columns: minmax(0, 1fr) 220px; gap: 14px; }
.hint { padding: 12px 14px; border: 1px solid var(--border-soft); border-radius: 12px; background: var(--slate-a2); color: var(--fg-muted); font-size: var(--text-base); line-height: 1.5; }
.hint b { display: block; margin-bottom: 4px; color: var(--fg-2); font-weight: 500; }

.formgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 14px; }
.formgrid .wide { grid-column: 1 / -1; }
.worklist { display: grid; gap: 6px; }
.worklist .err { margin: 0 0 4px; }
.addlink { margin-top: 6px; padding-left: 0; }

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
.vis { display: grid; gap: 14px; }
.pick.sm { min-height: 26px; font-size: var(--text-sm); }

.donehero { text-align: center; }
.donehero .ok { display: grid; place-items: center; width: 46px; height: 46px; margin: 0 auto 14px; border-radius: 50%; background: var(--jade-a3); color: var(--jade-11); }
.next3 { display: grid; gap: 8px; margin-top: 4px; }
.next3 .it { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-soft); border-radius: 12px; background: var(--slate-a2); }
.next3 .k { padding-top: 3px; color: var(--indigo-11); font: 600 11px/1 var(--font-mono); }
.next3 .grow { flex: 1; min-width: 0; }
.next3 b { display: block; color: var(--fg); font-weight: 500; }
.next3 .muted { font-size: var(--text-sm); }

.wiznav { display: flex; align-items: center; gap: 10px; margin-top: 26px; }
.wiznav .skip { flex: 1; min-width: 0; color: var(--fg-faint); font-size: var(--text-sm); text-align: right; }
.wiznav .note { color: var(--amber-11); }
.loaderr .center { display: flex; }

@media (max-width: 767px) {
  .join { padding: 14px 4px 28px; }
  .wizq { font-size: 21px; }
  .wizsub { font-size: 13.5px; margin-bottom: 18px; }
  .opts, .formgrid, .grid2, .storybox { grid-template-columns: minmax(0, 1fr); }
  .hide-sm { display: none; }
  .field.sub, .sub { margin-left: 0; }
  .wiznav { position: sticky; bottom: 0; margin: 22px -4px 0; padding: 10px 4px; background: var(--slot-bg); border-top: 1px solid var(--border-soft); }
  .wiznav .skip { font-size: 11.5px; }
}
</style>
