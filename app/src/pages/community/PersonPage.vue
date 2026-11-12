<script setup lang="ts">
// #/community/people/:person: one person, as the mockups' screen 5. Three
// layers in their own words and work: Said (what they told us), Linked
// (their links and handles), Earned (what they did in Arrow). Core and leads
// also get the team panel. Someone the team added who hasn't joined gets the
// "No account yet" banner and an empty Said.
// What renders is what the API returned for this viewer: signed out, the
// public card; signed in, the profile (place at the map's precision); the
// team, everything. A Discord handle someone typed shows as "said, not
// checked"; only one a sign-in proved (discord_id) is shown as theirs. A change of
// viewer clears the page before it loads again, so nothing from one level
// stays on screen for another.
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Icon from '../../frame/Icon.vue';
import DisciplineChip from '../../modules/registry/DisciplineChip.vue';
import PersonAvatar from '../../modules/registry/PersonAvatar.vue';
import ProfileCard from '../../modules/registry/ProfileCard.vue';
import StatusPill from '../../modules/registry/StatusPill.vue';
import TeamPanel from '../../modules/registry/TeamPanel.vue';
import SameStrip from '../../modules/registry/SameStrip.vue';
import { community, day, findView, fromYou, intro, loadCommunity, onTeam, shortPlace, teamAdded, teamName, viewer } from '../../modules/registry/community';
import { firstName } from '../../modules/registry/you';
import { localTime } from '../../modules/registry/taxonomy';
import {
  BUILD_OPTIONS, DEMO_ME, LANES, TOOLS, WANTS, loadCards, loadPerson, type Card, type PersonDetail,
} from '../../lib/registry';
import { remote } from '../../lib/backend';
import { SAMPLE_LABEL } from '../../data/registry-sample';
import { session } from '../../lib/session';
import { state as threadState, liveComments } from '../../modules/threads/store';
import { answers, loadAnswers } from '../../modules/guide/store';
import { longshotGuide } from '../../projects/longshot/guide';
import { zonePath } from '../../frame/nav';
import '../../modules/registry/registry.css';
import '../../modules/registry/community.css';

const route = useRoute();
const router = useRouter();
const id = computed(() => String(route.params.person));
const from = computed(() => (typeof route.query.from === 'string' ? findView(route.query.from, viewer.value) : null));

const person = ref<PersonDetail | null>(null);
const card = ref<Card | null>(null);
const phase = ref<'loading' | 'ready' | 'missing' | 'error'>('loading');
const loadError = ref('');
let loadedFor = '';

async function load() {
  if (remote && !session.ready) return;
  const key = `${viewer.value}|${session.userId ?? ''}|${id.value}`;
  if (key !== loadedFor) { person.value = null; card.value = null; phase.value = 'loading'; }
  loadedFor = key;
  try {
    if (viewer.value === 'public') {
      const cards = community.loadedFor.startsWith('public|') && community.phase === 'ready' ? community.cards : await loadCards();
      if (loadedFor !== key) return;
      card.value = cards.find((c) => c.id === id.value) ?? null;
      phase.value = card.value ? 'ready' : 'missing';
    } else {
      const p = await loadPerson(id.value);
      if (loadedFor !== key) return;
      person.value = p;
      phase.value = 'ready';
    }
  } catch (e) {
    if (loadedFor !== key) return;
    loadError.value = (e as Error).message;
    phase.value = /no such person/i.test(loadError.value) ? 'missing' : 'error';
  }
}
/** After the team changed something: this page, and the list's counts and columns. */
async function changed() {
  await load();
  void loadCommunity(true);
}
/** A lead deleted this record: back to the list. */
async function deleted() {
  void loadCommunity(true);
  await router.push('/community/people');
}
onMounted(() => {
  void load();
  void loadCommunity();
  void loadAnswers(longshotGuide.project, longshotGuide.id);
});
watch([viewer, () => session.userId, () => session.ready], () => void load());

const p = computed(() => person.value);
const pr = computed(() => p.value?.profile ?? null);
const name = computed(() => p.value?.name ?? card.value?.name ?? '');
const first = computed(() => firstName(name.value) || name.value);
watch(name, (n) => { document.title = `${n || 'Person'} · Community · Arrow`; }, { immediate: true });
const added = computed(() => !!p.value && teamAdded(p.value));
const showTeam = computed(() => onTeam.value && !!p.value && p.value.outreach !== undefined);
const place = computed(() => shortPlace(p.value?.city ?? card.value?.city, p.value?.country ?? card.value?.country));
const tz = computed(() => p.value?.tz ?? card.value?.tz ?? null);
const clock = computed(() => [localTime(tz.value), fromYou(tz.value)].filter(Boolean).join(' · '));
const monthYear = (ym: string | undefined) => {
  const [y, m] = (ym ?? '').split('-').map(Number);
  return y && m ? new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
};
/** How they came: the team sees where from; members see when. */
const came = computed(() => {
  const x = p.value;
  if (!x) return '';
  if (added.value) return `added by ${teamName(x.added_by) || 'the team'}${x.created_at ? `, ${day(x.created_at)}` : ''}`;
  const when = x.claimed_at ? day(x.claimed_at) : monthYear(x.joined);
  return [when ? `joined ${when}` : 'joined', x.source ? `via ${x.source}` : ''].filter(Boolean).join(' ');
});
const wtb = computed(() => pr.value?.wants_to_build?.trim() ?? '');
const sentence = (s: string | null | undefined) => (s ?? '').trim();
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// Linked ---------------------------------------------------------------------------------------
const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
const safeUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : '');
/** How a record the team added finds its person when they join. */
const linksBy = computed(() => {
  const x = p.value;
  if (!x) return '';
  if (x.github && x.github_id) return `GitHub ${x.github}`;
  if (x.discord && x.discord_id) return `Discord @${x.discord}`;
  if (x.email) return 'the email on this record, once they confirm it';
  return '';
});
/** The Discord handle they typed themselves, when no sign-in proved one. */
const said = computed(() => (p.value && !p.value.discord ? p.value.profile?.discord_said ?? '' : ''));
/** For the team: a handle on the record nobody resolved to an account. */
const discordUnchecked = computed(() => !!p.value?.discord && p.value.discord_id === null);
/** A handle the team couldn't turn into an id links nothing by itself. */
const unchecked = computed(() => {
  const x = p.value;
  if (!x) return '';
  return [x.github && !x.github_id ? `GitHub ${x.github}` : '', x.discord && !x.discord_id ? `Discord @${x.discord}` : ''].filter(Boolean).join(' and ');
});

// Earned: what they did here, the way Your Arrow lists it ------------------------------------
// Live, threads and answers carry account ids: the team gets the person's,
// and anyone can match a member by their GitHub login. The demo's sample
// people have done nothing in the app; your own record shows yours.
const authorId = computed(() => {
  const x = p.value;
  if (!x || !x.has_account) return null;
  if (!remote) return x.id === DEMO_ME ? 'me' : null;
  const uid = x.user_id ?? (x.github ? Object.values(session.members).find((m) => m.github?.toLowerCase() === x.github!.toLowerCase())?.user_id : undefined);
  return uid ? (uid === session.userId ? 'me' : uid) : null;
});
const questionText = new Map(longshotGuide.steps.flatMap((s) => s.questions.map((q) => [q.id, q.text] as const)));
interface Entry { at: string; text: string; link: { label: string; to: string | { path: string; query: Record<string, string> } } }
const earned = computed<Entry[]>(() => {
  const aid = authorId.value;
  if (!aid) return [];
  const out: Entry[] = [];
  for (const t of threadState.threads) {
    const to = { path: zonePath(t.zone), query: { thread: t.id } };
    if (t.authorId === aid) out.push({ at: t.raisedAt, text: 'Started a thread:', link: { label: t.title, to } });
    for (const c of liveComments(t)) if (c.authorId === aid) out.push({ at: c.at, text: 'Commented on', link: { label: t.title, to } });
  }
  for (const a of answers.list) if (a.authorId === aid) out.push({ at: a.at, text: 'Answered a guide question:', link: { label: questionText.get(a.question) ?? a.question, to: { path: '/longshot/build/guide', query: { question: a.question } } } });
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
});
</script>

<template>
  <div class="cm personp">
    <nav class="crumb" aria-label="Breadcrumb">
      <span>Community</span><Icon name="chevron-right" :size="12" />
      <RouterLink :to="from ? { path: '/community/people', query: { view: from.id } } : '/community/people'">{{ from && from.id !== 'all' ? from.label : 'People' }}</RouterLink>
      <template v-if="name"><Icon name="chevron-right" :size="12" /><b>{{ name }}</b></template>
    </nav>

    <p v-if="phase === 'loading'" class="state" role="status">Loading…</p>
    <div v-else-if="phase === 'missing'" class="state rg" data-missing>
      <p v-if="viewer === 'public'">This person isn't on Arrow's public map. Anyone signed in to Arrow sees everyone who finished a profile; sign in to see theirs.</p>
      <p v-else>Nobody here by that link. They may have been merged with another record.</p>
      <div class="row">
        <RouterLink class="btn" to="/community/people">All people</RouterLink>
        <button v-if="viewer === 'public' && remote" class="btn" type="button" @click="session.signInOpen = true">Sign in</button>
      </div>
    </div>
    <div v-else-if="phase === 'error'" class="state rg">
      <p class="err">Couldn't load this person: {{ loadError }}</p>
      <button class="btn" type="button" @click="load">Try again</button>
    </div>

    <!-- Signed out: the public card, and nothing more. -->
    <div v-else-if="card" class="public rg" data-public>
      <ProfileCard :card="card" />
      <div class="callout indigo"><Icon name="people" :size="16" /><div><b>This is {{ first }}'s public card.</b> Anyone signed in to Arrow sees more of their profile: what they want to build, their story, links, tools and time.
        <div class="row"><RouterLink class="btn sm primary" :to="{ path: '/join', query: { ref: 'community' } }">Join Arrow</RouterLink><button v-if="remote" class="btn sm" type="button" @click="session.signInOpen = true">Sign in</button></div></div></div>
    </div>

    <div v-else-if="p" class="person" :class="{ withteam: showTeam }">
      <div class="main">
        <header class="phead">
          <PersonAvatar :name="p.name" :size="56" />
          <div class="grow">
            <div class="titlerow">
              <h1 data-name>{{ p.name }}</h1>
              <div class="pills">
                <span v-if="added" class="pill plum">No account</span>
                <span v-if="!remote && p.id !== DEMO_ME" class="pill slate" data-sample-label>{{ SAMPLE_LABEL }}</span>
                <StatusPill v-if="showTeam && intro(p)" :status="intro(p)!.status" />
              </div>
            </div>
            <div class="meta">
              <span v-if="p.discord"><Icon name="discord" :size="13" />@{{ p.discord }}</span>
              <span v-else-if="said" data-said-handle><Icon name="discord" :size="13" />@{{ said }} <span class="faint">(said, not checked)</span></span>
              <span v-if="p.github"><Icon name="github" :size="13" />{{ p.github }}</span>
              <span><Icon name="pin" :size="13" />{{ place || 'place unknown' }}<template v-if="p.country && !p.city"> <span class="faint">(country only)</span></template></span>
              <span v-if="clock"><Icon name="clock" :size="13" />{{ clock }}</span>
              <span v-if="came"><Icon name="flag" :size="13" />{{ came }}</span>
            </div>
            <p v-if="wtb" class="wtb" data-wtb><span class="faint">Wants to build</span> “{{ wtb }}”</p>
          </div>
        </header>

        <SameStrip v-if="viewer === 'lead' && p.matches" :matches="p.matches" :person-name="p.name" @settled="changed" />

        <div v-if="added" class="callout plum rg banner" data-noaccount>
          <Icon name="lock" :size="16" />
          <div>
            <b>No account yet.</b> Only the core team and leads see this record. It isn't on the map and members can't see it.
            <template v-if="linksBy"> It links to {{ first }}'s account when they join with <b>{{ linksBy }}</b>; anything less certain, a lead confirms.</template>
            <template v-else-if="unchecked"> {{ unchecked }} isn't checked against an account yet, so when {{ first }} joins, a lead confirms it's them.</template>
            <template v-else> Add their GitHub, Discord or email so it can link when they join.</template>
            <div class="row">
              <RouterLink class="btn sm primary" :to="{ path: '/community/reach-out', query: { person: p.id, invite: 'join' } }" data-invite-join><Icon name="send" :size="13" /> Invite to join</RouterLink>
              <RouterLink class="btn sm" :to="{ path: '/community/reach-out', query: { person: p.id } }" data-invite-call><Icon name="video" :size="13" /> Invite to a call</RouterLink>
            </div>
          </div>
        </div>

        <section class="layer" data-said>
          <header><h2>Said</h2><span>{{ added ? `${first}'s own answers` : `what ${first} told us; carries little weight on its own` }}</span></header>
          <p v-if="added" class="muted">Nothing yet: {{ first }} hasn't joined. Their own answers go here when they do. What we know so far is in the team panel, and it stays there.</p>
          <p v-else-if="!pr" class="muted">{{ first }} hasn't filled in a profile yet.</p>
          <template v-else>
            <template v-if="sentence(pr.story)">
              <p class="label">Something they built, and what went wrong along the way</p>
              <blockquote class="quote" data-story>{{ pr.story }}</blockquote>
            </template>
            <p v-if="pr.blurb" class="blurb"><span class="faint">On their card:</span> {{ pr.blurb }}</p>
            <div class="grid2">
              <dl class="kv">
                <dt>Can do</dt><dd><div class="chips"><DisciplineChip v-for="d in pr.can" :key="d" :name="d" /></div><span v-if="!pr.can.length" class="faint">—</span></dd>
                <dt>Learning</dt><dd><div class="chips"><DisciplineChip v-for="d in pr.learn" :key="d" :name="d" kind="learn" /></div><span v-if="!pr.learn.length" class="faint">—</span></dd>
                <template v-if="pr.lanes.length"><dt>What fits</dt><dd>{{ pr.lanes.map((l) => LANES[l]).join(', ') }}</dd></template>
                <template v-if="pr.experience"><dt>Experience</dt><dd>{{ pr.experience }}</dd></template>
                <dt>Wants</dt><dd>{{ pr.wants.map((w) => WANTS[w]).join(', ') || '—' }}</dd>
                <dt>Time</dt><dd>{{ [pr.hours, pr.availability && lower(pr.availability)].filter(Boolean).join(', ') || '—' }}</dd>
              </dl>
              <dl class="kv">
                <dt>Tools</dt><dd>{{ pr.tools.map((t) => TOOLS[t]).join(', ') || '—' }}</dd>
                <dt>Would build</dt><dd>{{ pr.build.map((b) => BUILD_OPTIONS[b]).join(', ') || '—' }}</dd>
                <dt>Travel</dt><dd>{{ pr.travel || '—' }}</dd>
                <template v-if="pr.call_ok !== undefined"><dt>Intro call</dt><dd data-callok>{{ pr.call_ok ? `Open to one${pr.call_windows ? `: ${pr.call_windows}` : ''}` : 'Not asked for' }}</dd></template>
                <template v-if="pr.never"><dt>Don't ask</dt><dd>{{ pr.never }}</dd></template>
              </dl>
            </div>
          </template>
        </section>

        <section class="layer" data-linked>
          <header><h2>Linked</h2><span>{{ added ? 'what the team added; check before you rely on it' : 'evidence someone can check' }}</span></header>
          <div v-for="(l, i) in pr?.links ?? []" :key="i" class="linkrow">
            <span class="src"><Icon name="share" :size="12" /> {{ l.label || host(l.url) }}</span>
            <a v-if="safeUrl(l.url)" class="grow link" :href="safeUrl(l.url)" target="_blank" rel="noopener nofollow ugc">{{ l.url.replace(/^https?:\/\/(www\.)?/, '') }}</a>
            <span v-else class="grow">{{ l.url }}</span>
          </div>
          <div v-if="p.github" class="linkrow">
            <span class="src"><Icon name="github" :size="12" /> GitHub</span>
            <a class="grow link" :href="`https://github.com/${encodeURIComponent(p.github)}`" target="_blank" rel="noopener">{{ p.github }}</a>
            <span v-if="added" class="faint small">added by the team</span>
          </div>
          <div v-if="p.discord" class="linkrow" data-discord>
            <span class="src"><Icon name="discord" :size="12" /> Discord</span>
            <span class="grow">@{{ p.discord }}</span>
            <span v-if="added" class="faint small">added by the team{{ discordUnchecked ? ', not checked' : '' }}</span>
            <span v-else-if="discordUnchecked" class="faint small">not checked</span>
          </div>
          <div v-else-if="said" class="linkrow" data-discord-said>
            <span class="src"><Icon name="discord" :size="12" /> Discord</span>
            <span class="grow">@{{ said }}</span>
            <span class="faint small">said, not checked</span>
          </div>
          <div v-if="p.email" class="linkrow" data-email>
            <span class="src"><Icon name="mail" :size="12" /> Email</span>
            <span class="grow">{{ p.email }} <span class="teamtag"><Icon name="lock" :size="10" />team only</span></span>
            <span v-if="added" class="faint small">not confirmed by {{ first }} yet</span>
          </div>
          <p v-if="!(pr?.links?.length) && !p.github && !p.discord && !said && !p.email" class="muted">Nothing linked yet.</p>
        </section>

        <section class="layer" data-earned>
          <header><h2>Earned</h2><span>what happened in Arrow; nobody types this</span></header>
          <ul v-if="earned.length" class="tl">
            <li v-for="(e, i) in earned" :key="i"><span class="d">{{ day(e.at) }}</span>{{ e.text }} <RouterLink class="link" :to="e.link.to">{{ e.link.label }}</RouterLink></li>
          </ul>
          <p v-else class="muted">Nothing in Arrow yet{{ added ? `: it carries over when ${first} joins` : '' }}. Threads, comments and guide answers show here as they happen; PRs, builds and grants later.</p>
        </section>
      </div>

      <TeamPanel v-if="showTeam" :person="p" @changed="changed" @deleted="deleted" />
    </div>
  </div>
</template>

<style scoped>
.person { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; align-items: start; max-width: 900px; }
.person.withteam { grid-template-columns: minmax(0, 1fr) 380px; max-width: 1320px; }
.main { min-width: 0; padding: 18px; border: 1px solid var(--border-soft); border-radius: 12px; background: var(--surface); }
.phead { display: flex; align-items: flex-start; gap: 16px; }
.titlerow { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.phead h1 { font-size: 22px; overflow-wrap: anywhere; }
.pills { display: flex; gap: 6px; }
.meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 6px; color: var(--fg-muted); font-size: var(--text-base); }
.meta > span { display: inline-flex; align-items: center; gap: 5px; }
.wtb { margin: 10px 0 0; color: var(--fg); font-size: var(--text-nav); line-height: 1.5; }
.wtb .faint { margin-right: 4px; font-size: var(--text-sm); }
.banner { margin-top: 14px; }
.banner .row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.layer { margin-top: 16px; padding: 16px 18px; border: 1px solid var(--border-soft); border-radius: 12px; background: var(--slate-a2); }
.layer > header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; margin-bottom: 10px; }
.layer h2 { margin: 0; color: var(--fg); font-size: var(--text-nav); font-weight: 600; }
.layer > header span { color: var(--fg-faint); font-size: var(--text-base); }
.layer .muted { margin: 0; line-height: 1.5; }
.label { margin: 0 0 6px; color: var(--fg-muted); font-size: var(--text-sm); }
.quote { margin: 0; padding: 2px 0 2px 14px; border-left: 2px solid var(--indigo-8); color: var(--fg-2); font-size: var(--text-nav); line-height: 1.6; white-space: pre-wrap; overflow-wrap: anywhere; }
.blurb { margin: 12px 0 0; color: var(--fg-2); line-height: 1.5; }
.grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 20px; margin-top: 14px; }
.linkrow { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border-soft); }
.linkrow:last-of-type { border-bottom: 0; }
.linkrow .src { display: inline-flex; align-items: center; gap: 5px; width: 96px; flex: none; color: var(--fg-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.linkrow .grow { overflow-wrap: anywhere; }
.public { display: grid; gap: 12px; max-width: 520px; }
.public .row, .state .row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.err { margin: 0 0 10px; color: var(--red-11); }

@media (max-width: 1279px) {
  .person.withteam { grid-template-columns: minmax(0, 1fr) 340px; }
}
@media (max-width: 1023px) {
  .person.withteam { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .main { padding: 14px 12px; }
  .phead { gap: 12px; }
  .phead :deep(.av) { width: 40px !important; height: 40px !important; font-size: 14px !important; }
  .phead h1 { font-size: 19px; }
  .layer { padding: 14px 12px; }
  .grid2 { grid-template-columns: minmax(0, 1fr); }
  .linkrow { flex-wrap: wrap; gap: 2px 10px; }
  .linkrow .grow { flex-basis: calc(100% - 106px); }
  .linkrow > .small { flex-basis: 100%; padding-left: 106px; }
}
</style>
