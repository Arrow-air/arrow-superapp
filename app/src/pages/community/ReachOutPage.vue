<script setup lang="ts">
// #/community/reach-out: Intro calls, as the onboarding mockups' screen 6.
// The queue (people the team put in the intro-call queue, and people who
// asked for a call on their profile, not invited yet), best signal first;
// the stages after it; a composer that drafts the call invite (a first line
// about them, two or three times picked in your zone and written in theirs)
// or, for someone with no account, the join invite with a personal link; and
// the after-call note. The app never sends anything: you copy the draft and
// send it from your own Discord or email, then record what you did here.
// Person pages link in with ?person=<id> (a call) and &invite=join (join).
// Say hi (new Discord members) comes with the bot; welcome calls later.
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../../frame/Icon.vue';
import DisciplineChip from '../../modules/registry/DisciplineChip.vue';
import PersonAvatar from '../../modules/registry/PersonAvatar.vue';
import StatusPill from '../../modules/registry/StatusPill.vue';
import AfterCall from '../../modules/registry/AfterCall.vue';
import {
  cap, community, day, fromYou, intro, loadCommunity, myTeamId, onTeam, shortPlace, skillsOf, teamAdded, teamName, viewer,
} from '../../modules/registry/community';
import {
  RANKING, STAGES, callDraft, discordDm, hookFor, inStage, inviteRef, joinDraft, joinLink, localInput, myZone, neededNow,
  notesDue, ranked, sameClock, slotText, suggestSlots, validZone, type Stage,
} from '../../modules/registry/reach';
import { firstName } from '../../modules/registry/you';
import { localTime } from '../../modules/registry/taxonomy';
import { demoTeam, loadPerson, setOutreach, type Person, type PersonDetail } from '../../lib/registry';
import { remote } from '../../lib/backend';
import { session } from '../../lib/session';
import '../../modules/registry/registry.css';
import '../../modules/registry/community.css';

const route = useRoute();
const router = useRouter();
onMounted(() => { document.title = 'Reach out · Community · Arrow'; void loadCommunity(); });
watch(() => session.ready, (r) => { if (r) void loadCommunity(); });

const q = (k: string) => (typeof route.query[k] === 'string' ? (route.query[k] as string) : '');
const people = computed(() => (community.phase === 'ready' ? community.people : []));
const selId = computed(() => q('person'));
const sel = computed(() => people.value.find((p) => p.id === selId.value) ?? null);

// The stages ---------------------------------------------------------------------------------------
const counts = computed(() => Object.fromEntries(STAGES.map((s) => [s.id, people.value.filter((p) => inStage(p, s.id)).length])) as Record<Stage, number>);
const stage = ref<Stage>('queue');
// Arriving for someone in a later stage opens that stage.
watch(sel, (p) => {
  if (!p || inStage(p, stage.value)) return;
  const s = STAGES.find((x) => inStage(p, x.id));
  if (s) stage.value = s.id;
}, { immediate: true });
const list = computed(() => {
  const inIt = people.value.filter((p) => inStage(p, stage.value));
  if (stage.value === 'queue') return ranked(inIt, neededNow.value);
  return inIt.map((p) => ({ p, score: 0, why: [] as string[], days: 0 }))
    .sort((a, b) => (intro(b.p)?.updated_at ?? '').localeCompare(intro(a.p)?.updated_at ?? ''));
});
const STAGE_HEAD: Record<Stage, [string, string]> = {
  queue: ['To invite', 'best signal first'], invited: ['Invited', 'latest first'], booked: ['Call booked', 'latest first'],
  talked: ['Talked', 'latest first'], due: ['Call notes due', 'latest first'],
};
const pick = async (id: string) => {
  await router.replace({ query: { person: id } });
  if (window.matchMedia('(max-width: 1023px)').matches) { await nextTick(); document.querySelector('[data-composer]')?.scrollIntoView({ block: 'start' }); }
};
// With nobody picked, the top of the list is.
const current = computed<Person | null>(() => sel.value ?? list.value[0]?.p ?? null);
const excerpt = (p: Person) => {
  if (p.profile?.story) return p.profile.story;
  if (p.profile?.wants_to_build) return `Wants to build: ${p.profile.wants_to_build}`;
  return teamAdded(p) ? `Added by ${teamName(p.added_by) || 'the team'}: ${p.source ?? ''}` : '';
};
const since = (p: Person) => {
  const at = stage.value === 'queue' ? p.profile?.finished_at ?? p.created_at : intro(p)?.updated_at;
  return at ? day(at) : '';
};
const zoneLine = (p: Person) => {
  const place = shortPlace(p.city, p.country) || 'place unknown';
  if (!p.tz) return `${place} · time zone unknown`;
  return `${place} · ${localTime(p.tz)} there · ${fromYou(p.tz)}`;
};

// The selected person, in full (notes, for the first line and the after-call) ------------------
const detail = ref<PersonDetail | null>(null);
let detailFor = '';
async function loadDetail() {
  const id = current.value?.id ?? '';
  if (id !== detailFor) detail.value = null;
  detailFor = id;
  if (!id) return;
  try {
    const d = await loadPerson(id);
    if (detailFor === id) detail.value = d;
  } catch { /* the list's copy is enough to draft from */ }
}
watch(() => current.value?.id, () => void loadDetail(), { immediate: true });
const who = computed<Person | null>(() => (detail.value && detail.value.id === current.value?.id ? detail.value : current.value));
const first = computed(() => (who.value ? firstName(who.value.name) || who.value.name : ''));
const newestNote = computed(() => (detail.value?.id === who.value?.id ? detail.value?.notes?.[0] ?? null : null));

// The draft ----------------------------------------------------------------------------------------
type Mode = 'call' | 'join';
const mode = ref<Mode>('call');
watch([() => current.value?.id, () => q('invite')], () => {
  mode.value = q('invite') === 'join' && current.value && teamAdded(current.value) ? 'join' : 'call';
}, { immediate: true });
const setMode = (m: Mode) => { mode.value = m; void router.replace({ query: { ...route.query, person: current.value?.id, invite: m === 'join' ? 'join' : undefined } }); };

const myName = computed(() => (remote ? session.member?.display_name || 'me' : demoTeam.find((m) => m.id === myTeamId())?.name ?? 'Thomas'));
const theirZone = computed(() => (validZone(who.value?.tz) ? who.value!.tz! : null));
const slots = ref<Date[]>([]);
watch(() => [current.value?.id, theirZone.value], () => { slots.value = suggestSlots(theirZone.value); }, { immediate: true });
const setSlot = (i: number, v: string) => {
  const t = new Date(v);
  if (Number.isNaN(+t)) return;
  slots.value = slots.value.map((s, j) => (j === i ? t : s));
};
const dropSlot = (i: number) => { slots.value = slots.value.filter((_, j) => j !== i); };
const addSlot = () => {
  const last = slots.value[slots.value.length - 1] ?? new Date();
  slots.value = [...slots.value, new Date(last.getTime() + 864e5)];
};
const theirTime = (s: Date) => (theirZone.value ? (sameClock(s, theirZone.value) ? 'same for them' : `${slotText(s, theirZone.value)} for ${first.value}`) : '');

/** Who on the team pointed you to them, for the first line. */
const pointer = computed(() => {
  const x = who.value;
  if (!x) return null;
  const by = newestNote.value?.author_id ?? x.added_by ?? null;
  return by && by !== myTeamId() ? cap(teamName(by)) : null;
});
const hook = computed(() => (who.value ? hookFor(who.value, pointer.value) : { line: '', from: 'none' as const }));
const ref_ = computed(() => inviteRef(myName.value));
const link = computed(() => joinLink(ref_.value));
const auto = computed(() => {
  const x = who.value;
  if (!x) return '';
  return mode.value === 'join' ? joinDraft(x, myName.value, hook.value.line, link.value)
    : callDraft({ person: x, me: myName.value, hook: hook.value.line, slots: slots.value, tz: theirZone.value });
});
const text = ref('');
const edited = ref(false);
watch(auto, (v) => { if (!edited.value) text.value = v; }, { immediate: true });
watch([() => current.value?.id, mode], () => { edited.value = false; text.value = auto.value; copied.value = false; });
const redraft = () => { edited.value = false; text.value = auto.value; };
const draftedFrom = computed(() => {
  switch (hook.value.from) {
    case 'story': return `The first line is from ${first.value}'s story.`;
    case 'build': return `The first line is from what ${first.value} wants to build.`;
    case 'pointer': return `${first.value} hasn't written anything yet, so the first line says who pointed you to them. What the team knows is above.`;
    default: return `${first.value} hasn't written anything yet: make the first line about them.`;
  }
});

// Sending is yours ------------------------------------------------------------------------------
const copied = ref(false);
async function copy() {
  let ok = false;
  try { await navigator.clipboard.writeText(text.value); ok = true; } catch {
    const ta = document.querySelector<HTMLTextAreaElement>('[data-draft]');
    if (ta) { ta.select(); ok = document.execCommand('copy'); }
  }
  copied.value = ok;
  if (ok) window.setTimeout(() => { copied.value = false; }, 2500);
}
const dm = computed(() => discordDm(who.value?.discord_id));
const mailto = computed(() => {
  const e = who.value?.email;
  if (!e) return '';
  const subject = mode.value === 'join' ? 'Building with Arrow' : 'A 20-minute call with Arrow?';
  return `mailto:${encodeURIComponent(e)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text.value)}`;
});
/** How their record finds them when they join: what the join invite says. */
const linksBy = computed(() => {
  const x = who.value;
  if (!x) return '';
  if (x.github && x.github_id) return `GitHub (${x.github})`;
  if (x.email) return 'the email on their record';
  return '';
});

// Recording what you did --------------------------------------------------------------------------
const busy = ref('');
const err = ref('');
const flash = ref('');
const showAfter = ref(false);
watch(() => current.value?.id, () => { err.value = ''; flash.value = ''; showAfter.value = false; });
async function refresh() {
  await loadCommunity(true);
  await loadDetail();
}
async function mark(status: 'invited' | 'booked' | 'talked') {
  const x = who.value;
  if (!x) return;
  busy.value = status;
  err.value = '';
  try {
    const takeIt = !intro(x)?.owner_id && myTeamId();
    const note = status === 'invited' ? (mode.value === 'join' ? 'Invited to join' : 'Invited to a call') : undefined;
    await setOutreach(x.id, { status, note, ...(takeIt ? { owner: myTeamId()! } : {}) });
    flash.value = status === 'invited' ? `Marked invited${takeIt ? ', and they\'re yours now' : ''}.` : status === 'booked' ? 'Marked call booked.' : 'Marked talked. Write the call notes below while it\'s fresh.';
    if (status === 'talked') showAfter.value = true;
    await refresh();
  } catch (e) {
    err.value = (e as Error).message;
  } finally {
    busy.value = '';
  }
}
const status = computed(() => (who.value ? intro(who.value)?.status ?? 'new' : 'new'));
const afterOpen = computed(() => !!who.value && (showAfter.value || status.value === 'booked' || notesDue(who.value)));
</script>

<template>
  <div class="cm rg reach">
    <nav class="crumb" aria-label="Breadcrumb"><span>Community</span><Icon name="chevron-right" :size="12" /><b>Reach out</b><span class="teamtag"><Icon name="lock" :size="11" />team only</span></nav>

    <p v-if="remote && !session.ready" class="state" role="status">Loading…</p>
    <div v-else-if="!onTeam" class="state" data-team-only>
      <h1>Core and leads only</h1>
      <p class="lede">Reaching out to people is for Arrow's core team and leads.<template v-if="viewer === 'public'"> Sign in if that's you.</template></p>
      <p><RouterLink class="link" to="/community/people">See everyone in Community</RouterLink></p>
    </div>

    <template v-else>
      <div class="top">
        <div>
          <h1>Reach out</h1>
          <p class="lede" data-never-sent>Invite the people you pick to a 20-minute intro call, and people the team added to join Arrow. The app drafts the message and keeps track; you send it yourself, from your own Discord or email. Nothing is sent from here.</p>
        </div>
        <RouterLink class="btn" to="/community/people/add"><Icon name="plus" :size="14" />Add a person</RouterLink>
      </div>

      <p v-if="community.phase === 'loading' || community.phase === 'idle'" class="state" role="status">Loading people…</p>
      <div v-else-if="community.phase === 'error'" class="state">
        <p class="err">Couldn't load the registry: {{ community.error }}</p>
        <button class="btn" type="button" @click="loadCommunity(true)">Try again</button>
      </div>

      <template v-else>
        <div class="pipe" role="tablist" aria-label="Where people are" data-pipe>
          <button
            v-for="s in STAGES" :key="s.id" type="button" role="tab" :aria-selected="stage === s.id" :class="{ due: s.id === 'due' && counts.due }"
            :title="s.hint" :data-stage="s.id" @click="stage = s.id"
          ><b>{{ counts[s.id] }}</b>{{ s.label }}</button>
        </div>

        <div class="calls">
          <div class="queue" data-queue>
            <div class="qhead"><b>{{ STAGE_HEAD[stage][0] }}</b><span class="faint small">{{ STAGE_HEAD[stage][1] }}</span></div>
            <button
              v-for="r in list" :key="r.p.id" type="button" class="qcard" :class="{ on: current?.id === r.p.id }" :aria-pressed="current?.id === r.p.id"
              :data-q="r.p.id" :data-score="stage === 'queue' ? r.score : undefined" @click="pick(r.p.id)"
            >
              <span class="qrow">
                <PersonAvatar :name="r.p.name" :size="22" />
                <b class="nm">{{ r.p.name }}</b>
                <span v-if="teamAdded(r.p)" class="acct">no account</span>
                <span class="faint small when">{{ since(r.p) }}</span>
              </span>
              <span v-if="skillsOf(r.p).names.length" class="chips">
                <DisciplineChip v-for="d in skillsOf(r.p).names.slice(0, 3)" :key="d" :name="d" :kind="skillsOf(r.p).guess ? 'guess' : 'can'" />
              </span>
              <span v-if="excerpt(r.p)" class="ex">{{ excerpt(r.p) }}</span>
              <span class="tzl"><Icon name="clock" :size="11" />{{ zoneLine(r.p) }}</span>
              <span v-if="r.why.length" class="sig" data-signal>{{ r.why.join(' · ') }}</span>
            </button>
            <p v-if="!list.length" class="faint small empty">{{ stage === 'queue' ? 'Nobody is waiting for an invite. Put someone in the intro-call queue from their page, or add a person.' : 'Nobody here right now.' }}</p>
            <p v-if="stage === 'queue'" class="why" data-ranking>{{ RANKING }}</p>
          </div>

          <div class="right">
            <section v-if="who" class="composer" data-composer :data-mode="mode">
              <div class="chead">
                <PersonAvatar :name="who.name" :size="36" />
                <div class="grow">
                  <div class="crow">
                    <b class="cname" data-composer-name>{{ mode === 'join' ? `Invite ${who.name} to join` : `Invite ${who.name} to a call` }}</b>
                    <span v-if="teamAdded(who)" class="acct">no account</span>
                    <StatusPill :status="status" />
                  </div>
                  <div class="faint small">{{ zoneLine(who) }}</div>
                </div>
                <RouterLink class="btn sm ghost" :to="`/community/people/${who.id}`">Record <Icon name="arrow" :size="12" /></RouterLink>
              </div>

              <div v-if="teamAdded(who)" class="seg modes" role="radiogroup" aria-label="What to send">
                <button type="button" role="radio" :aria-checked="mode === 'join'" data-mode-join @click="setMode('join')">Invite to join</button>
                <button type="button" role="radio" :aria-checked="mode === 'call'" data-mode-call @click="setMode('call')">Invite to a call</button>
              </div>

              <div v-if="teamAdded(who) && (who.source || newestNote)" class="know" data-know>
                <span class="teamtag"><Icon name="lock" :size="10" />what we know</span>
                <p v-if="who.source"><span class="faint">From:</span> {{ who.source }}</p>
                <p v-if="newestNote"><span class="faint">{{ cap(teamName(newestNote.author_id) || 'the team') }}, {{ day(newestNote.created_at) }}:</span> {{ newestNote.body }}</p>
              </div>

              <div v-if="mode === 'call'" class="times" data-times>
                <div class="thead">
                  <span class="small muted">Times, in your time ({{ myZone() }})</span>
                  <span v-if="theirZone" class="small faint">{{ first }} is in {{ theirZone }}</span>
                  <span v-else class="small warn" data-no-zone>{{ first }}'s time zone isn't known, so the draft gives yours with the zone's name.</span>
                </div>
                <div v-for="(s, i) in slots" :key="i" class="slot" data-slot>
                  <input class="input" type="datetime-local" :value="localInput(s)" :aria-label="`Time ${i + 1}, your time`" @change="setSlot(i, ($event.target as HTMLInputElement).value)" />
                  <span v-if="theirZone" class="theirs" data-their-time>{{ theirTime(s) }}</span>
                  <button type="button" class="x" :aria-label="`Remove time ${i + 1}`" @click="dropSlot(i)">×</button>
                </div>
                <button v-if="slots.length < 3" type="button" class="btn sm ghost" data-add-slot @click="addSlot"><Icon name="plus" :size="12" />Add a time</button>
              </div>

              <label class="label" for="draft">The message <span class="faint">yours to rewrite; it goes out as you</span></label>
              <textarea id="draft" v-model="text" class="input msg" rows="10" data-draft @input="edited = true"></textarea>
              <p class="why">
                {{ draftedFrom }}
                <template v-if="mode === 'join'"> The link carries <code>ref={{ ref_ }}</code>, so we see who brought them.
                  <template v-if="linksBy">If they sign up with {{ linksBy }}, their record links by itself; any other way, a lead confirms it's them.</template>
                  <template v-else>Their record has nothing that links by itself, so when they join, a lead confirms it's them.</template>
                </template>
                <button v-if="edited" type="button" class="linkbtn" data-redraft @click="redraft">Start the draft again</button>
              </p>

              <div class="send">
                <button class="btn primary" type="button" :disabled="!text.trim()" data-copy @click="copy"><Icon :name="copied ? 'check-circle' : 'file'" :size="14" />{{ copied ? 'Copied' : 'Copy' }}</button>
                <a v-if="dm" class="btn" :href="dm" target="_blank" rel="noopener" data-open-discord><Icon name="discord" :size="14" />Open in Discord</a>
                <a v-if="mailto" class="btn" :href="mailto" data-open-mail><Icon name="mail" :size="14" />Open in your email</a>
                <span v-if="!dm && who.discord" class="faint small" data-no-discord-id>No Discord id for @{{ who.discord }} yet: find them in Arrow's Discord.</span>
              </div>

              <div class="record">
                <span class="small muted">Then record what you did:</span>
                <button class="btn sm" type="button" :disabled="!!busy || status === 'invited'" data-mark="invited" @click="mark('invited')">{{ busy === 'invited' ? 'Saving…' : 'Mark invited' }}</button>
                <button class="btn sm" type="button" :disabled="!!busy || status === 'booked'" data-mark="booked" @click="mark('booked')">{{ busy === 'booked' ? 'Saving…' : 'Call booked' }}</button>
                <button class="btn sm" type="button" :disabled="!!busy || status === 'talked'" data-mark="talked" @click="mark('talked')">{{ busy === 'talked' ? 'Saving…' : 'Talked' }}</button>
              </div>
              <p v-if="flash" class="okline" role="status" data-flash><Icon name="check-circle" :size="13" />{{ flash }}</p>
              <p v-if="err" class="err" role="alert" data-reach-err>{{ err }}</p>
            </section>
            <p v-else class="state">Pick someone from the list.</p>

            <AfterCall v-if="who && afterOpen" :person="who" @saved="refresh" />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.crumb .teamtag { margin-left: 6px; }
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.top .btn { flex: none; }
.pipe { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin: 16px 0 14px; max-width: 1240px; }
.pipe button {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 9px 12px; border: 1px solid var(--border-soft); border-radius: 10px;
  background: var(--slate-a2); color: var(--fg-muted); font: inherit; font-size: var(--text-sm); text-align: left; cursor: pointer;
}
.pipe button:hover { border-color: var(--slate-a7); }
.pipe button b { color: var(--fg); font-size: 18px; font-weight: 600; line-height: 1.2; }
.pipe button[aria-selected='true'] { border-color: var(--indigo-8); background: var(--indigo-a3); color: var(--indigo-12); }
.pipe button.due { border-color: var(--team-line); }
.pipe button.due b { color: var(--amber-11); }
.pipe button:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.calls { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 16px; align-items: start; max-width: 1240px; }
.qhead { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
.qhead b { color: var(--fg); font-size: var(--text-nav); font-weight: 600; }
.qcard {
  display: flex; flex-direction: column; gap: 6px; width: 100%; margin-bottom: 8px; padding: 10px 12px; border: 1px solid var(--border-soft); border-radius: 10px;
  background: var(--surface); color: var(--fg-2); font: inherit; font-size: var(--text-base); text-align: left; cursor: pointer;
}
.qcard:hover { border-color: var(--slate-a7); }
.qcard.on { border-color: var(--indigo-8); box-shadow: 0 0 0 1px var(--indigo-8) inset; }
.qcard:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }
.qrow { display: flex; align-items: center; gap: 8px; min-width: 0; }
.qrow .nm { min-width: 0; overflow: hidden; color: var(--fg); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.qrow .when { margin-left: auto; flex: none; }
.ex { display: -webkit-box; overflow: hidden; color: var(--fg-2); line-height: 1.45; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.tzl { display: inline-flex; align-items: center; gap: 5px; color: var(--fg-faint); font-size: var(--text-sm); }
.sig { color: var(--fg-muted); font-size: var(--text-sm); }
.empty { margin: 4px 0 8px; line-height: 1.5; }
.right { display: grid; gap: 14px; min-width: 0; }
.composer { padding: 16px 18px; border: 1px solid var(--border-soft); border-radius: 12px; background: var(--surface); }
.chead { display: flex; align-items: flex-start; gap: 10px; }
.crow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
.cname { color: var(--fg); font-size: var(--text-nav); font-weight: 600; }
.modes { margin-top: 14px; }
.know { margin-top: 12px; padding: 9px 12px; border: 1px solid var(--team-line); border-radius: 10px; background: var(--team-bg); }
.know p { margin: 5px 0 0; color: var(--fg-2); line-height: 1.5; overflow-wrap: anywhere; }
.times { display: grid; gap: 6px; margin: 14px 0 12px; }
.thead { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px; }
.thead .warn { color: var(--amber-11); }
.slot { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; }
.slot .input { width: auto; min-height: 30px; padding: 4px 8px; color-scheme: light dark; }
.slot .theirs { color: var(--indigo-11); font-size: var(--text-sm); }
.slot .x { margin-left: auto; padding: 0 6px; border: 0; background: none; color: var(--fg-faint); font: inherit; font-size: 16px; cursor: pointer; }
.slot .x:hover { color: var(--fg); }
.times > .btn { justify-self: start; }
.label { margin-top: 12px; }
.msg { min-height: 220px; font-size: var(--text-base); line-height: 1.55; }
.why code { font: 11.5px var(--font-mono); color: var(--fg-2); }
.linkbtn { margin-left: 4px; padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; cursor: pointer; }
.linkbtn:hover { text-decoration: underline; }
.send, .record { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 12px; }
.record { padding-top: 12px; border-top: 1px solid var(--border-soft); }
.okline { display: flex; gap: 6px; align-items: baseline; margin: 10px 0 0; color: var(--jade-11); font-size: var(--text-sm); }
.state h1 { margin-bottom: 4px; }
@media (max-width: 1023px) {
  .calls { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .top { flex-direction: column; gap: 10px; }
  .pipe { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
  .pipe button { padding: 7px 9px; }
  .pipe button b { font-size: 16px; }
  .composer { padding: 12px; }
  .msg { min-height: 260px; }
  .slot .input { flex: 1 1 180px; }
  .slot .theirs { order: 3; flex-basis: 100%; }
}
</style>
