<script setup lang="ts">
// #/you: Your Arrow, the top bar's Contributor Dashboard. What they want to
// build, under the greeting; a short getting-started list (a hello for
// #introductions drafted from their answers, the welcome call once those are
// scheduled, one real thing); work matched to what they said; their public
// card; and their record here. Signed out, it's the join wizard instead.
// At the bottom, Delete my profile, behind a confirm that says what goes.
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../frame/Icon.vue';
import ProfileCard from '../modules/registry/ProfileCard.vue';
import { matchedFrom, matchesFor } from '../modules/registry/matching';
import { DISCORD_INVITE, WELCOME_CALL, firstName, greeting, helloDraft, useTick } from '../modules/registry/you';
import { deleteMyProfile, myProfile, type Card, type Person } from '../lib/registry';
import { forgetDraft } from '../modules/registry/join';
import { remote } from '../lib/backend';
import { session } from '../lib/session';
import { useDraft } from '../lib/drafts';
import { state as threadState, liveComments } from '../modules/threads/store';
import { answers, loadAnswers } from '../modules/guide/store';
import { longshotGuide } from '../projects/longshot/guide';
import { zonePath } from '../frame/nav';
import '../modules/registry/registry.css';

const router = useRouter();
const me = ref<Person | null>(null);
const phase = ref<'loading' | 'ready' | 'error'>('loading');
const loadError = ref('');

async function load() {
  if (remote && !session.userId) { void router.replace('/join'); return; }
  phase.value = 'loading';
  try {
    me.value = await myProfile();
    phase.value = 'ready';
  } catch (e) {
    loadError.value = (e as Error).message;
    phase.value = 'error';
  }
  void loadAnswers(longshotGuide.project, longshotGuide.id);
}
onMounted(() => {
  document.title = 'Your Arrow · Arrow';
  if (remote && !session.ready) {
    const stop = watch(() => session.ready, (r) => { if (r) { stop(); void load(); } });
  } else void load();
});
// Signing out here goes back to the join page; signing in as someone else reloads.
watch(() => session.userId, (id, was) => { if (!remote || !session.ready || id === was) return; if (!id) void router.replace('/join'); else void load(); });

const pr = computed(() => me.value?.profile ?? null);
const finished = computed(() => !!pr.value?.finished_at);
const wtb = computed(() => { const t = (pr.value?.wants_to_build ?? '').trim(); return t && !/[.!?…)"”]$/.test(t) ? `${t}.` : t; });
const hello = computed(() => `${greeting()}${firstName(me.value?.name ?? '') ? `, ${firstName(me.value!.name)}` : ''}`);

// Getting started ------------------------------------------------------------------
const { text: helloText } = useDraft(() => 'registry-hello');
watch(me, (m) => { if (m?.profile && !helloText.value.trim()) helloText.value = helloDraft(m); }, { immediate: true });
const posted = useTick('hello-posted');
const copied = ref(false);
async function copyHello() {
  try { await navigator.clipboard.writeText(helloText.value); }
  catch {
    // Plain-http previews have no clipboard API.
    const ta = document.querySelector<HTMLTextAreaElement>('#hello');
    ta?.select();
    document.execCommand('copy');
  }
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 2500);
}
const redraft = () => { if (me.value) helloText.value = helloDraft(me.value); };

// What they've done here ------------------------------------------------------------
interface Entry { at: string; text: string; link?: { label: string; to: string | { path: string; query: Record<string, string> } } }
const HEARD_HOW: Record<string, string> = {
  X: 'on X', YouTube: 'on YouTube', Discord: 'on Discord', GitHub: 'on GitHub', 'A friend': 'from a friend', 'An event': 'at an event', Search: 'by searching',
};
const questionText = new Map(longshotGuide.steps.flatMap((s) => s.questions.map((q) => [q.id, q.text] as const)));
const record = computed<Entry[]>(() => {
  const m = me.value;
  if (!m) return [];
  const out: Entry[] = [];
  const heard = pr.value?.heard_from ? HEARD_HOW[pr.value.heard_from] : '';
  const joinedAt = m.claimed_at ?? pr.value?.updated_at;
  if (joinedAt) out.push({ at: joinedAt, text: `Joined${heard ? `, heard about Arrow ${heard}` : ''}${m.ref ? ` (link: ${m.ref})` : ''}` });
  if (pr.value?.finished_at) out.push({ at: pr.value.finished_at, text: 'Profile done' });
  for (const t of threadState.threads) {
    const to = { path: zonePath(t.zone), query: { thread: t.id } };
    if (t.authorId === 'me') out.push({ at: t.raisedAt, text: 'Started a thread:', link: { label: t.title, to } });
    for (const c of liveComments(t)) if (c.authorId === 'me') out.push({ at: c.at, text: 'Commented on', link: { label: t.title, to } });
  }
  for (const a of answers.list) {
    if (a.authorId !== 'me') continue;
    out.push({ at: a.at, text: 'Answered a guide question:', link: { label: questionText.get(a.question) ?? a.question, to: { path: '/longshot/build/guide', query: { question: a.question } } } });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
});
const shownRecord = computed(() => record.value.slice(0, 8));
const didReal = computed(() => record.value.some((e) => e.link));
const day = (iso: string) => { const t = new Date(iso); return Number.isNaN(+t) ? '' : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

const steps = computed(() => [true, posted.value, ...(WELCOME_CALL ? [false] : []), didReal.value]);
const doneCount = computed(() => steps.value.filter(Boolean).length);

// Matched for you ----------------------------------------------------------------------
const interests = computed(() => ({ can: pr.value?.can ?? [], learn: pr.value?.learn ?? [], tools: pr.value?.tools ?? [], lanes: pr.value?.lanes ?? [], build: pr.value?.build ?? [] }));
const following = computed(() => interests.value.lanes.length === 1 && interests.value.lanes[0] === 'follow');
const matches = computed(() => matchesFor(interests.value, threadState.threads, longshotGuide.steps, (q) => answers.list.some((a) => a.question === q)));

// Deleting their profile: their account stays.
const confirmDelete = ref(false);
const deleting = ref(false);
const deleteError = ref('');
const deletedNote = ref(false);
async function deleteProfile() {
  deleting.value = true;
  deleteError.value = '';
  try {
    await deleteMyProfile();
    forgetDraft();
    helloText.value = '';
    confirmDelete.value = false;
    deletedNote.value = true;
    me.value = await myProfile();
  } catch (e) {
    deleteError.value = (e as Error).message;
  } finally {
    deleting.value = false;
  }
}

// Their card, as the map shows it.
const card = computed<Card | null>(() => {
  const m = me.value;
  if (!m) return null;
  const shown = m.map === 'city' || m.map === 'country';
  return {
    id: m.id, name: m.name, city: m.map === 'city' ? m.city : null, country: shown ? m.country : null, lat: null, lng: null,
    tz: shown ? m.tz : null, disciplines: pr.value?.map_disciplines ?? [], blurb: pr.value?.blurb ?? null, discord: m.discord, github: m.github, joined: m.joined,
  };
});
</script>

<template>
  <div class="rg youp">
    <p v-if="phase === 'loading'" class="state" role="status">Loading Your Arrow…</p>
    <div v-else-if="phase === 'error'" class="state">
      <p class="err">Couldn't load your profile: {{ loadError }}</p>
      <button class="btn" type="button" @click="load">Try again</button>
    </div>

    <!-- No profile yet, or one left partway -->
    <div v-else-if="!finished" class="start">
      <h1 class="title">{{ hello }}</h1>
      <template v-if="pr?.wants_to_build">
        <p class="lede">You're partway through your profile. Carry on where you stopped; it takes a minute or two.</p>
        <RouterLink class="btn primary lg" to="/join">Finish your profile</RouterLink>
      </template>
      <template v-else>
        <p class="lede">Tell us what you want to build and what you can do. Three minutes, one question at a time, and a person on the core team reads it.</p>
        <RouterLink class="btn primary lg" to="/join">Fill in your profile</RouterLink>
      </template>
    </div>

    <div v-else class="you">
      <div class="col">
        <h1 class="title">{{ hello }}</h1>
        <p class="lede" data-wtb>You want to build: <span class="wtb">{{ wtb }}</span> Here's where to start.</p>

        <section class="sec" aria-labelledby="gs-h">
          <h2 id="gs-h">Getting started <span class="n">{{ doneCount }} of {{ steps.length }}</span></h2>
          <div class="checks">
            <div class="check done">
              <span class="cb"><Icon name="check-circle" :size="20" /></span>
              <div class="grow"><b>Fill in your profile</b></div>
            </div>
            <div class="check" :class="{ done: posted }" data-check="hello">
              <button class="cb" type="button" role="checkbox" :aria-checked="posted" aria-label="I posted my hello" @click="posted = !posted"><Icon v-if="posted" name="check-circle" :size="20" /></button>
              <div class="grow">
                <b>Say hello in #introductions</b>
                <div class="muted small">We drafted one from your answers. Edit it, or write your own, then post it on Arrow's Discord.</div>
                <template v-if="!posted">
                  <textarea id="hello" v-model="helloText" class="draftbox" rows="4" aria-label="Your hello for #introductions"></textarea>
                  <div class="row">
                    <button class="btn sm primary" type="button" data-copy @click="copyHello">{{ copied ? 'Copied' : 'Copy' }}</button>
                    <a class="btn sm" :href="DISCORD_INVITE" target="_blank" rel="noopener"><Icon name="discord" :size="13" /> Open Arrow's Discord</a>
                    <button class="btn sm ghost" type="button" @click="redraft">Redraft from my answers</button>
                  </div>
                </template>
              </div>
            </div>
            <div v-if="WELCOME_CALL" class="check" data-check="call">
              <span class="cb"></span>
              <div class="grow"><b>Come to a welcome call</b><div class="muted small">{{ WELCOME_CALL.label }}. {{ WELCOME_CALL.detail }}</div></div>
              <a v-if="WELCOME_CALL.url" class="btn sm" :href="WELCOME_CALL.url" target="_blank" rel="noopener">Add to calendar</a>
            </div>
            <div class="check" :class="{ done: didReal }" data-check="real">
              <span class="cb"><Icon v-if="didReal" name="check-circle" :size="20" /></span>
              <div class="grow"><b>Do one real thing</b><div class="muted small">Answer a guide question, weigh in on a thread, post a build log, or open a PR.</div></div>
            </div>
          </div>
          <p class="why">These steps don't earn ARROW. Real work does: retro grants at each freeze, and bounties and grants from decisions.</p>
        </section>

        <section class="sec" aria-labelledby="m-h">
          <h2 id="m-h">Matched for you <span v-if="matches.length" class="n">{{ matchedFrom(interests) }}</span></h2>
          <template v-if="following">
            <p class="muted small">You're following along, so here's where things happen.</p>
            <RouterLink class="match" to="/longshot/overview/summary"><div class="grow"><div class="proj">Longshot · Overview</div><b>Longshot, Arrow's battery pack, at a glance</b></div><span class="btn sm">Open</span></RouterLink>
            <RouterLink class="match" to="/quiver/overview/summary"><div class="grow"><div class="proj">Quiver · Overview</div><b>Quiver, the open drone, at a glance</b></div><span class="btn sm">Open</span></RouterLink>
            <RouterLink class="match" to="/quiver/discussion/all"><div class="grow"><div class="proj">Quiver · Discussion</div><b>Every open thread, with the votes so far</b></div><span class="btn sm">Open</span></RouterLink>
          </template>
          <template v-else-if="matches.length">
            <RouterLink v-for="m in matches" :key="m.key" class="match" :to="m.to" :data-match="m.key">
              <div class="grow"><div class="proj">{{ m.where }}</div><b>{{ m.title }}</b><div class="because">{{ m.because }}</div></div>
              <span class="btn sm">Open</span>
            </RouterLink>
          </template>
          <p v-else class="muted small">Nothing matches yet. Add what you can do and the tools you have, and we'll point you at work that fits.
            <RouterLink class="link" :to="{ path: '/join', query: { step: 'skills' } }">Add skills</RouterLink></p>
        </section>
      </div>

      <aside class="col side">
        <div class="callout indigo"><Icon name="people" :size="16" /><div><b>What happens next</b><br />A person on the core team reads every profile. If there's a fit, Thomas or a project lead will message you on Discord, usually within a week.</div></div>

        <section class="sec" aria-labelledby="c-h">
          <h2 id="c-h">Your card</h2>
          <ProfileCard v-if="card" :card="card" />
          <p class="why" data-card-why>{{ me!.map === 'off'
            ? 'Not on the map. Anyone signed in to Arrow sees your profile: what you want to build, the story, what you can do, links, tools and time, but not where you are.'
            : `Public, on the map. Anyone signed in to Arrow also sees your story, what you can do, links, tools and time, and your ${me!.map === 'city' ? 'city' : 'country'} as on the map.` }}</p>
          <div class="row">
            <RouterLink class="btn sm" to="/join">Edit profile</RouterLink>
            <RouterLink class="btn sm ghost" :to="{ path: '/join', query: { step: 'visibility' } }">Who sees what</RouterLink>
          </div>
        </section>

        <section class="sec" aria-labelledby="r-h">
          <h2 id="r-h">Your record</h2>
          <ul class="tl" data-record>
            <li v-for="(e, i) in shownRecord" :key="i"><span class="d">{{ day(e.at) }}</span>{{ e.text }} <RouterLink v-if="e.link" class="link" :to="e.link.to">{{ e.link.label }}</RouterLink></li>
          </ul>
          <p v-if="record.length > shownRecord.length" class="why">And {{ record.length - shownRecord.length }} more.</p>
          <p class="why">Earned work shows up here: threads, comments and guide answers now; PRs, builds and grants later.</p>
        </section>
      </aside>
    </div>

    <p v-if="phase === 'ready' && deletedNote && !me" class="why gone" role="status" data-profile-deleted>Your profile is deleted. Your Arrow account is still here; fill in a new profile whenever you like.</p>
    <section v-if="phase === 'ready' && me" class="sec del" aria-labelledby="del-h" data-delete-mine>
      <h2 id="del-h">Delete my profile</h2>
      <template v-if="confirmDelete">
        <div class="confirm" data-confirm-delete>
          <p><b>Delete your profile for good?</b></p>
          <p>What goes: everything you told us here (what you want to build, your story, what you can do, links, tools, time), your card on the map, and where you are.</p>
          <p>What stays: your Arrow account, so you stay signed in to the app, flights and the forum; and threads, comments and guide answers you wrote, where you wrote them. You can fill in a new profile any time.</p>
          <div class="row">
            <button class="btn sm danger" type="button" :disabled="deleting" data-confirm @click="deleteProfile">Delete my profile</button>
            <button class="btn sm ghost" type="button" :disabled="deleting" @click="confirmDelete = false">Keep it</button>
          </div>
        </div>
      </template>
      <button v-else class="btn sm ghost danger" type="button" data-delete-profile @click="confirmDelete = true">Delete my profile…</button>
      <p v-if="deleteError" class="err" role="alert">{{ deleteError }}</p>
    </section>
  </div>
</template>

<style scoped>
.youp { padding: 22px 24px 40px; }
.del { max-width: 1180px; margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border-soft); }
.del .confirm { max-width: 560px; padding: 12px 14px; border: 1px solid var(--red-a6); border-radius: 10px; background: var(--red-a2); }
.del .confirm p { margin: 0 0 8px; color: var(--fg-2); line-height: 1.5; }
.del .row { display: flex; flex-wrap: wrap; gap: 8px; }
.youp .btn.danger { border-color: var(--red-a7); color: var(--red-11); }
.youp .btn.danger:hover { background: var(--red-a3); }
.gone { margin-top: 12px; }
.state { padding: 24px 0; color: var(--fg-muted); }
.start { max-width: 560px; padding: 20px 0; }
.start .btn { margin-top: 16px; }
.you { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; max-width: 1180px; }
.col { min-width: 0; }
.title { margin: 0; color: var(--fg); font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
.lede { margin: 6px 0 0; color: var(--fg-muted); font-size: var(--text-nav); line-height: 1.55; }
.wtb { color: var(--fg); }
.sec { margin-top: 22px; }
.side .sec:first-of-type { margin-top: 18px; }
.sec h2 { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; margin: 0 0 8px; color: var(--fg); font-size: var(--text-nav); font-weight: 600; }
.sec h2 .n { color: var(--fg-faint); font: 400 11px var(--font-mono); }
.small { font-size: var(--text-sm); }
.muted { color: var(--fg-muted); }
.row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.link { color: var(--indigo-11); text-decoration: none; }
.link:hover { text-decoration: underline; }

.checks { border: 1px solid var(--border-soft); border-radius: 12px; background: var(--slate-a2); }
.check { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--border-soft); }
.check:last-child { border-bottom: 0; }
.check .cb { display: grid; place-items: center; width: 20px; height: 20px; flex: none; margin-top: 1px; padding: 0; border: 1.5px solid var(--slate-7); border-radius: 50%; background: none; color: var(--jade-9); cursor: default; }
button.cb { cursor: pointer; }
.check.done .cb { border: 0; }
.check b { color: var(--fg); font-weight: 500; }
.check.done b { color: var(--fg-muted); text-decoration: line-through; text-decoration-color: var(--slate-7); }
.grow { flex: 1; min-width: 0; }
.draftbox {
  display: block; width: 100%; margin-top: 8px; padding: 10px 12px; border: 0; border-left: 3px solid #5865f2; border-radius: 8px;
  background: #2b2d31; color: #dbdee1; font: 13px/1.45 'gg sans', system-ui, sans-serif; resize: vertical; outline: none;
}
.draftbox:focus { box-shadow: 0 0 0 2px var(--focus-ring); }

.match { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px; padding: 12px 14px; border: 1px solid var(--border-soft); border-radius: 10px; background: var(--slate-a2); color: inherit; text-decoration: none; }
.match:hover { border-color: var(--slate-a7); }
.match .proj { margin-bottom: 4px; color: var(--fg-faint); font: 600 10px/1.3 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; }
.match b { color: var(--fg); font-weight: 500; }
.match .because { margin-top: 4px; color: var(--fg-faint); font-size: var(--text-sm); }

.tl { position: relative; margin: 0; padding: 0 0 0 16px; list-style: none; font-size: var(--text-base); }
.tl::before { content: ''; position: absolute; top: 6px; bottom: 6px; left: 4px; width: 1px; background: var(--slate-6); }
.tl li { position: relative; padding: 4px 0; color: var(--fg-2); overflow-wrap: anywhere; }
.tl li::before { content: ''; position: absolute; top: 11px; left: -15px; width: 7px; height: 7px; border-radius: 50%; background: var(--slate-8); }
.tl .d { margin-right: 8px; color: var(--fg-faint); font: 11px var(--font-mono); }

@media (max-width: 1023px) {
  .you { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .youp { padding: 16px 12px 28px; }
  .title { font-size: 20px; }
}
</style>
