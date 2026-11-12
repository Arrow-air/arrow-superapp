<script setup lang="ts">
// #/community/people/add: core and leads add someone who has no account yet,
// as the onboarding mockups' screen 8. Name and where we know them from are
// required, so every record says where it came from. While they type, the
// registry is searched for the same name, handles or email (sa_find_people),
// and a GitHub login is turned into GitHub's numeric id in the browser: the
// id is what links the record when they sign in, and sa_add_person never
// trusts a login alone. A Discord username is kept as typed until phase 2's
// bot can look it up. Members and visitors get a plain "core and leads only".
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../../frame/Icon.vue';
import TaxonomyPicker from '../../modules/registry/TaxonomyPicker.vue';
import { loadCommunity, myTeamId, onTeam, teamMembers } from '../../modules/registry/community';
import { githubLogin, lookupGitHub, lookupWords, validGitHubLogin, type GitHubLookup } from '../../modules/registry/resolve';
import { validZone } from '../../modules/registry/reach';
import { TOOLS, addPerson, findPeople, type Candidate, type Tool } from '../../lib/registry';
import { session } from '../../lib/session';
import { remote } from '../../lib/backend';
import '../../modules/registry/registry.css';
import '../../modules/registry/community.css';

const router = useRouter();
onMounted(() => { document.title = 'Add a person · Community · Arrow'; void loadCommunity(); });

const f = reactive({
  name: '', source: '', discord: '', github: '', email: '', city: '', country: '', tz: '',
  guess: [] as string[], tools: [] as Tool[], owner: '', note: '', queue: false,
});
// The owner starts as you, once the session knows who you are.
watch(() => myTeamId(), (me) => { if (!f.owner && me) f.owner = me; }, { immediate: true });
const owners = computed(() => teamMembers.value);
const toggleTool = (t: Tool) => { f.tools = f.tools.includes(t) ? f.tools.filter((x) => x !== t) : [...f.tools, t]; };

const zones: string[] = (() => { try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone'); } catch { return []; } })();

// GitHub: login → id ------------------------------------------------------------------------------
const gh = ref<{ login: string; state: 'idle' | 'checking' | 'done'; result: GitHubLookup | null }>({ login: '', state: 'idle', result: null });
let ghTimer = 0;
let ghAbort: AbortController | null = null;
let ghPending: Promise<void> | null = null;
function checkGitHub() {
  const login = githubLogin(f.github);
  ghAbort?.abort();
  if (!login) { gh.value = { login: '', state: 'idle', result: null }; ghPending = null; return; }
  if (!validGitHubLogin(login)) { gh.value = { login, state: 'done', result: { ok: false, why: 'invalid' } }; ghPending = null; return; }
  const ctl = new AbortController();
  ghAbort = ctl;
  gh.value = { login, state: 'checking', result: null };
  ghPending = lookupGitHub(login, ctl.signal).then((r) => {
    if (ctl.signal.aborted) return;
    gh.value = { login, state: 'done', result: r };
  }).catch(() => { /* aborted: a newer login is being checked */ });
}
watch(() => f.github, () => {
  window.clearTimeout(ghTimer);
  const login = githubLogin(f.github);
  if (login !== gh.value.login || !login) gh.value = { login, state: login ? 'checking' : 'idle', result: null };
  ghTimer = window.setTimeout(checkGitHub, 450);
});
const ghId = computed(() => (gh.value.result?.ok ? gh.value.result.id : null));
const ghFail = computed(() => (gh.value.state === 'done' && gh.value.result && !gh.value.result.ok ? gh.value.result : null));

// Already in the registry? -----------------------------------------------------------------------
const dupes = ref<Candidate[]>([]);
const dupeState = ref<'idle' | 'checking' | 'done' | 'error'>('idle');
let dupeTimer = 0;
let dupeSeq = 0;
const handle = (s: string) => s.trim().replace(/^@/, '');
const probe = computed(() => ({
  name: f.name.trim().length >= 3 ? f.name.trim() : '', discord: handle(f.discord), github: githubLogin(f.github),
  email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()) ? f.email.trim() : '', githubId: ghId.value ?? undefined,
}));
watch(probe, (q) => {
  window.clearTimeout(dupeTimer);
  if (!q.name && !q.discord && !q.github && !q.email) { dupes.value = []; dupeState.value = 'idle'; return; }
  dupeState.value = 'checking';
  const seq = ++dupeSeq;
  dupeTimer = window.setTimeout(async () => {
    try {
      const r = await findPeople(q);
      if (seq === dupeSeq) { dupes.value = r; dupeState.value = 'done'; }
    } catch {
      if (seq === dupeSeq) dupeState.value = 'error';
    }
  }, 350);
}, { deep: true });
onBeforeUnmount(() => { window.clearTimeout(dupeTimer); window.clearTimeout(ghTimer); ghAbort?.abort(); });
const WHY: Record<Candidate['why'][number], string> = { name: 'the same name', discord: 'the same Discord', github: 'the same GitHub', email: 'the same email' };
const whyText = (c: Candidate) => c.why.map((w) => WHY[w]).join(', ');
/** A handle or email match is almost surely the same person; a name may not be. */
const sure = computed(() => dupes.value.some((c) => c.why.some((w) => w !== 'name')));

// Saving ---------------------------------------------------------------------------------------------
const errors = reactive({ name: '', source: '', github: '', tz: '' });
const err = ref('');
const busy = ref<'' | 'add' | 'invite'>('');
async function add(then: 'page' | 'invite') {
  errors.name = f.name.trim() ? '' : 'A name, as they go by.';
  errors.source = f.source.trim() ? '' : 'Where you know them from, so every record says where it came from.';
  errors.tz = f.tz.trim() && !validZone(f.tz.trim()) ? 'Pick a time zone from the list, like America/Chicago.' : '';
  window.clearTimeout(ghTimer);
  if (githubLogin(f.github) && (gh.value.state !== 'done' || gh.value.login !== githubLogin(f.github))) checkGitHub();
  if (ghPending) await ghPending;
  errors.github = ghFail.value?.why === 'invalid' ? lookupWords(ghFail.value, gh.value.login) : '';
  const first = (['name', 'source', 'github', 'tz'] as const).find((k) => errors[k]);
  if (first) { document.getElementById(`ap-${first}`)?.focus(); return; }
  busy.value = then === 'page' ? 'add' : 'invite';
  err.value = '';
  try {
    const id = await addPerson({
      name: f.name.trim(), source: f.source.trim(),
      githubLogin: gh.value.result?.ok ? gh.value.result.login : githubLogin(f.github) || undefined, githubId: ghId.value,
      discordUsername: handle(f.discord) || undefined, discordId: null,
      email: f.email.trim() || undefined, city: f.city.trim() || undefined, country: f.country.trim() || undefined, tz: f.tz.trim() || undefined,
      guessDisciplines: f.guess, guessTools: f.tools, owner: f.owner || undefined, note: f.note.trim() || undefined, introQueue: f.queue,
    });
    await loadCommunity(true);
    await router.push(then === 'page' ? `/community/people/${id}` : { path: '/community/reach-out', query: { person: id, invite: 'join' } });
  } catch (e) {
    err.value = (e as Error).message;
  } finally {
    busy.value = '';
  }
}
const signedIn = computed(() => !remote || !!session.userId);
</script>

<template>
  <div class="cm rg addp">
    <nav class="crumb" aria-label="Breadcrumb"><span>Community</span><Icon name="chevron-right" :size="12" /><RouterLink to="/community/people">People</RouterLink><Icon name="chevron-right" :size="12" /><b>Add a person</b><span class="teamtag"><Icon name="lock" :size="11" />core and leads</span></nav>

    <p v-if="remote && !session.ready" class="state" role="status">Loading…</p>
    <div v-else-if="!onTeam" class="state" data-team-only>
      <h1>Core and leads only</h1>
      <p class="lede">Adding people to the registry is for Arrow's core team and leads.<template v-if="!signedIn"> Sign in if that's you.</template></p>
      <p><RouterLink class="link" to="/community/people">See everyone in Community</RouterLink></p>
    </div>

    <div v-else class="addgrid">
      <form class="card pad" novalidate data-addform @submit.prevent="add('page')">
        <h1>Add a person</h1>
        <p class="lede">Someone who hasn't joined yet: met at a build day, helping in Discord, already in the repos. Only core and leads see them. They aren't on the map and members can't see them, until they join and choose to be.</p>

        <div class="formgrid">
          <div>
            <label class="label" for="ap-name">Name <span class="req">required</span></label>
            <input id="ap-name" v-model="f.name" class="input" maxlength="80" autocomplete="off" :aria-invalid="!!errors.name" @input="errors.name = ''" />
            <p v-if="errors.name" class="err">{{ errors.name }}</p>
          </div>
          <div>
            <label class="label" for="ap-source">Where do you know them from? <span class="req">required</span></label>
            <input id="ap-source" v-model="f.source" class="input" maxlength="200" placeholder="Met at the Austin build day" :aria-invalid="!!errors.source" @input="errors.source = ''" />
            <p v-if="errors.source" class="err">{{ errors.source }}</p>
          </div>

          <div class="wide" aria-live="polite" data-dupes>
            <div v-if="dupes.length" class="callout team">
              <Icon name="people" :size="16" />
              <div>
                <b>{{ sure ? 'Already in the registry:' : 'Maybe already in the registry:' }}</b>{{ ' ' }}
                <span v-for="(c, i) in dupes" :key="c.id"><template v-if="i">, </template><RouterLink class="dlink" :to="`/community/people/${c.id}`" :data-dupe="c.id">{{ c.name }}</RouterLink> <span class="faint">({{ whyText(c) }}{{ c.has_account ? '' : ', no account' }})</span></span>.
                {{ sure ? 'Open that record instead of making a second one.' : 'If it\'s them, open that record instead.' }}
              </div>
            </div>
            <p v-else-if="dupeState === 'done'" class="okline"><Icon name="check-circle" :size="13" />Nobody in the registry has this name, Discord, GitHub or email.</p>
            <p v-else-if="dupeState === 'error'" class="why">Couldn't check the registry for duplicates just now.</p>
          </div>

          <div>
            <label class="label" for="ap-discord"><Icon name="discord" :size="13" />Discord</label>
            <input id="ap-discord" v-model="f.discord" class="input" maxlength="40" placeholder="username" autocomplete="off" />
            <p class="why" data-discord-note>Saved as a username for now, without an id: Arrow's Discord bot can't look people up yet, so a lead confirms it's them when they join.</p>
          </div>
          <div>
            <label class="label" for="ap-github"><Icon name="github" :size="13" />GitHub</label>
            <input id="ap-github" v-model="f.github" class="input" maxlength="80" placeholder="login" autocomplete="off" :aria-invalid="!!errors.github" @input="errors.github = ''" />
            <div aria-live="polite" data-gh>
              <p v-if="gh.state === 'checking'" class="why">Checking GitHub…</p>
              <p v-else-if="gh.result?.ok" class="okline" data-gh-ok><Icon name="check-circle" :size="13" />github.com/{{ gh.result.login }}<template v-if="gh.result.name"> ({{ gh.result.name }})</template>. Its id is saved, so the record links when they sign in with GitHub.</p>
              <p v-else-if="ghFail" :class="ghFail.why === 'invalid' ? 'err' : 'warnline'" data-gh-fail>{{ lookupWords(ghFail, gh.login) }}<template v-if="ghFail.why !== 'invalid'"> The login is saved without an id, and when they join, a lead confirms it's them.</template></p>
            </div>
          </div>
          <div>
            <label class="label" for="ap-email"><Icon name="mail" :size="13" />Email <span class="teamtag"><Icon name="lock" :size="10" />team only</span></label>
            <input id="ap-email" v-model="f.email" class="input" type="email" maxlength="200" placeholder="Only if they gave it to you" autocomplete="off" />
          </div>
          <div>
            <label class="label" for="ap-owner">Owner</label>
            <select id="ap-owner" v-model="f.owner" class="input">
              <option value="">Nobody yet</option>
              <option v-for="m in owners" :key="m.id" :value="m.id">{{ m.id === myTeamId() ? `${m.name} (you)` : m.name }}</option>
            </select>
          </div>
          <div>
            <label class="label" for="ap-city">City</label>
            <input id="ap-city" v-model="f.city" class="input" maxlength="80" />
          </div>
          <div>
            <label class="label" for="ap-country">Country</label>
            <input id="ap-country" v-model="f.country" class="input" maxlength="60" />
          </div>
          <div>
            <label class="label" for="ap-tz">Time zone <span class="faint">so call times show in theirs</span></label>
            <input id="ap-tz" v-model="f.tz" class="input" list="ap-zones" maxlength="64" placeholder="America/Chicago" autocomplete="off" :aria-invalid="!!errors.tz" @input="errors.tz = ''" />
            <datalist id="ap-zones"><option v-for="z in zones" :key="z" :value="z" /></datalist>
            <p v-if="errors.tz" class="err">{{ errors.tz }}</p>
          </div>

          <div class="wide">
            <p class="label">What they seem good at <span class="faint">your guess; they pick their own when they join</span></p>
            <TaxonomyPicker v-model:can="f.guess" :cycle="false" label="What they seem good at" />
          </div>
          <div class="wide">
            <p class="label">Tools they have <span class="faint">if you know</span></p>
            <div class="picks">
              <button v-for="(label, t) in TOOLS" :key="t" type="button" class="pick" :aria-pressed="f.tools.includes(t)" :data-tool="t" @click="toggleTool(t)">{{ label }}</button>
            </div>
          </div>
          <div class="wide">
            <label class="label" for="ap-note">First note <span class="teamtag"><Icon name="lock" :size="10" />team only</span></label>
            <textarea id="ap-note" v-model="f.note" class="input" rows="3" maxlength="8000" placeholder="What you saw, and why they're worth knowing. Facts, not verdicts."></textarea>
          </div>
          <div class="wide">
            <button type="button" class="toggle" role="switch" :aria-checked="f.queue" data-queue @click="f.queue = !f.queue"><span class="sw"></span>Put them in the intro-call queue</button>
          </div>
        </div>

        <p v-if="err" class="err big" role="alert" data-add-err>{{ err }}</p>
        <div class="actions">
          <button class="btn primary lg" type="submit" :disabled="!!busy" data-add><Icon name="plus" :size="14" />{{ busy === 'add' ? 'Adding…' : 'Add to registry' }}</button>
          <button class="btn lg" type="button" :disabled="!!busy" data-add-invite @click="add('invite')"><Icon name="send" :size="14" />{{ busy === 'invite' ? 'Adding…' : 'Add and invite to join' }}</button>
          <RouterLink class="btn ghost lg" to="/community/people">Cancel</RouterLink>
        </div>
      </form>

      <aside class="card pad rules">
        <h2>How a record finds its person</h2>
        <ul>
          <li><b>Their GitHub account</b> links it the first time they sign in. The id is saved when you add them, so a login someone else takes later gets nothing.</li>
          <li><b>The email on the record</b> links it once they confirm the address: a link we email, or GitHub verified it.</li>
          <li><b>Anything weaker</b> (the same name, a handle we couldn't check, a Discord username for now): a lead gets "same person?" and decides.</li>
          <li>When it links, their own answers fill Said. Your guesses and notes stay with the team, and the map is their choice.</li>
          <li>Some never join, like a shop that machines parts for us. The record stays team-only.</li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.addp .crumb .teamtag { margin-left: 6px; }
.addgrid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; max-width: 1180px; }
.card { min-width: 0; border: 1px solid var(--border-soft); border-radius: 12px; background: var(--surface); }
.pad { padding: 18px 20px; }
.formgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; margin-top: 18px; }
.formgrid .wide { grid-column: 1 / -1; }
.req { color: var(--fg-faint); font-size: 11px; }
.label .faint { font-size: inherit; }
.okline, .warnline { display: flex; gap: 6px; align-items: baseline; margin: 6px 0 0; font-size: var(--text-sm); line-height: 1.45; }
.okline { color: var(--jade-11); }
.okline svg { flex: none; transform: translateY(2px); }
.warnline { color: var(--amber-11); }
[data-dupes]:empty { display: none; }
[data-dupes] .okline { margin: 0; }
.dlink { color: var(--amber-12); text-decoration: underline; text-underline-offset: 2px; }
.err.big { margin-top: 14px; font-size: var(--text-base); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
.rules h2 { margin: 0; color: var(--fg); font-size: var(--text-nav); font-weight: 600; }
.rules ul { display: grid; gap: 8px; margin: 10px 0 0; padding-left: 18px; color: var(--fg-2); line-height: 1.5; }
.rules li b { color: var(--fg); font-weight: 500; }
.rules .why { margin-top: 12px; }
.state h1 { margin-bottom: 4px; }
@media (max-width: 1023px) {
  .addgrid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 767px) {
  .pad { padding: 14px 12px; }
  .formgrid { grid-template-columns: minmax(0, 1fr); }
  .actions .btn { flex: 1 1 auto; }
}
</style>
