<script setup lang="ts">
// The team's side of a person's page, as the mockups' screen 5: owner,
// status, next step and what they're good for (sa_set_outreach); what the
// team knows of someone who hasn't said (their guesses, sa_update_person);
// skill checks; notes, with a composer and edits; and the history.
// Only rendered for core and leads, from fields only they get from
// sa_registry_person: a member's page never has any of this in it.
import { computed, ref, watch } from 'vue';
import Icon from '../../frame/Icon.vue';
import DisciplineChip from './DisciplineChip.vue';
import TaxonomyPicker from './TaxonomyPicker.vue';
import StatusPill from './StatusPill.vue';
import { STATUS, cap, day, intro, myTeamId, teamAdded, teamMembers, teamName, viewer, whose } from './community';
import { firstName } from './you';
import {
  DISCIPLINES, TOOLS, addNote, editNote, setOutreach, updatePerson,
  type Note, type NoteKind, type OutreachStatus, type PersonDetail, type Tool, type Verdict,
} from '../../lib/registry';

const props = defineProps<{ person: PersonDetail }>();
const emit = defineEmits<{ changed: [] }>();

const p = computed(() => props.person);
const first = computed(() => firstName(p.value.name) || p.value.name);
const o = computed(() => intro(p.value));
const me = computed(() => myTeamId());
const isLead = computed(() => viewer.value === 'lead');

// One change at a time; a failure says why, next to the panel's top.
const busy = ref('');
const err = ref('');
async function run(what: string, fn: () => Promise<unknown>) {
  busy.value = what;
  err.value = '';
  try { await fn(); emit('changed'); return true; } catch (e) { err.value = (e as Error).message; return false; } finally { busy.value = ''; }
}

// Owner, status, next step, good for ---------------------------------------------------
const owners = computed(() => {
  const list = teamMembers.value.slice();
  const cur = o.value?.owner_id;
  if (cur && !list.some((m) => m.id === cur)) list.push({ id: cur, name: teamName(cur) });
  return list;
});
const setOwner = (id: string) => run('owner', () => setOutreach(p.value.id, id ? { owner: id } : { unassign: true }));
const takeIt = () => run('owner', () => setOutreach(p.value.id, { owner: me.value! }));
const setStatus = (s: OutreachStatus) => run('status', () => setOutreach(p.value.id, { status: s }));

const next = ref(o.value?.next_step ?? '');
watch(() => o.value?.next_step, (x) => (next.value = x ?? ''));
const nextDirty = computed(() => next.value.trim() !== (o.value?.next_step ?? ''));
const saveNext = () => run('next', () => setOutreach(p.value.id, { nextStep: next.value.trim() }));

const goodFor = computed(() => o.value?.good_for ?? []);
const newTag = ref('');
async function addTag() {
  const t = newTag.value.trim();
  if (!t || goodFor.value.includes(t)) { newTag.value = ''; return; }
  if (await run('good', () => setOutreach(p.value.id, { goodFor: [...goodFor.value, t] }))) newTag.value = '';
}
const dropTag = (t: string) => run('good', () => setOutreach(p.value.id, { goodFor: goodFor.value.filter((x) => x !== t) }));

// What we know: the team's guesses, for someone who hasn't said ----------------------------
const showKnow = computed(() => teamAdded(p.value) || !!p.value.guess);
const editingKnow = ref(false);
const kSource = ref('');
const kGuess = ref<string[]>([]);
const kTools = ref<Tool[]>([]);
function editKnow() {
  kSource.value = p.value.source ?? '';
  kGuess.value = [...(p.value.guess?.disciplines ?? [])];
  kTools.value = [...(p.value.guess?.tools ?? [])];
  editingKnow.value = true;
}
const toggleTool = (t: Tool) => { kTools.value = kTools.value.includes(t) ? kTools.value.filter((x) => x !== t) : [...kTools.value, t]; };
async function saveKnow() {
  if (await run('know', () => updatePerson(p.value.id, { source: kSource.value.trim(), guess_disciplines: kGuess.value, guess_tools: kTools.value }))) editingKnow.value = false;
}

// Skill checks ------------------------------------------------------------------------------
const VERDICT: Record<Verdict, string> = { seen_work: 'seen their work', talked: 'talked it through', tested: 'tested it' };
const skills = computed(() => {
  const rows: { name: string; how: string; kind: 'can' | 'learn' | 'guess'; checked: boolean; who: string }[] = [];
  const seen = new Set<string>();
  for (const k of p.value.skill_checks ?? []) {
    if (seen.has(k.discipline)) continue;
    seen.add(k.discipline);
    rows.push({ name: k.discipline, how: VERDICT[k.verdict], kind: 'can', checked: true, who: `${cap(teamName(k.checked_by) || 'the team')}, ${day(k.checked_at)}` });
  }
  for (const d of p.value.profile?.can ?? []) if (!seen.has(d)) { seen.add(d); rows.push({ name: d, how: 'said so', kind: 'can', checked: false, who: '' }); }
  for (const d of p.value.profile?.learn ?? []) if (!seen.has(d)) { seen.add(d); rows.push({ name: d, how: 'learning', kind: 'learn', checked: false, who: '' }); }
  if (!p.value.profile?.can.length) for (const d of p.value.guess?.disciplines ?? []) if (!seen.has(d)) { seen.add(d); rows.push({ name: d, how: 'our guess', kind: 'guess', checked: false, who: '' }); }
  return rows;
});

// Notes ---------------------------------------------------------------------------------------
const KIND: Record<NoteKind, string> = { note: 'Note', call: 'Call', review: 'Review', skill: 'Skill check' };
const notes = computed(() => p.value.notes ?? []);
const kind = ref<NoteKind>('note');
const body = ref('');
const sDiscipline = ref('');
const sVerdict = ref<Verdict>('seen_work');
// Their own disciplines (or the team's guess) first, then the rest of the taxonomy.
const disciplineOptions = computed(() => {
  const theirs = [...(p.value.profile?.can ?? []), ...(p.value.profile?.learn ?? []), ...(p.value.guess?.disciplines ?? [])].filter((d, i, a) => a.indexOf(d) === i);
  return { theirs, rest: DISCIPLINES.filter((d) => !theirs.includes(d)) };
});
const canPost = computed(() => !!body.value.trim() && (kind.value !== 'skill' || !!sDiscipline.value) && !busy.value);
async function post() {
  if (!canPost.value) return;
  const skill = kind.value === 'skill' ? { discipline: sDiscipline.value, verdict: sVerdict.value } : undefined;
  if (await run('note', () => addNote(p.value.id, kind.value, body.value.trim(), skill))) { body.value = ''; sDiscipline.value = ''; kind.value = 'note'; }
}
const canEdit = (n: Note) => n.author_id === me.value || isLead.value;
const editing = ref('');
const editBody = ref('');
const startEdit = (n: Note) => { editing.value = n.id; editBody.value = n.body; };
async function saveEdit(n: Note) {
  if (await run(`edit:${n.id}`, () => editNote(n.id, editBody.value))) editing.value = '';
}

// History: notes, outreach changes, and their own milestones, newest first -------------------
const history = computed(() => {
  const out: { at: string; text: string; team: boolean }[] = [];
  const pp = p.value;
  const hist = (pp.outreach ?? []).flatMap((x) => (x.history ?? []).map((h) => ({ ...h, kind: x.kind })));
  if (teamAdded(pp) || pp.added_by) {
    if (!hist.some((h) => h.note?.startsWith('Added'))) out.push({ at: pp.created_at ?? '', text: `Added by ${teamName(pp.added_by) || 'the team'}${pp.source ? `: ${pp.source}` : ''}`, team: true });
  }
  if (pp.claimed_at) out.push({ at: pp.claimed_at, text: pp.added_by ? 'Joined, and their account linked to this record' : 'Joined', team: false });
  if (pp.profile?.finished_at) out.push({ at: pp.profile.finished_at, text: `Profile done${pp.profile.call_ok ? ', open to a call' : ''}`, team: false });
  for (const h of hist) {
    const by = cap(teamName(h.by) || 'someone on the team');
    const parts: string[] = [];
    if (h.note?.startsWith('Added:')) parts.push(`added ${first.value}: ${h.note.slice(6).trim()}`);
    if (h.status) parts.push(`set the status to ${STATUS[h.status as OutreachStatus]?.[0] ?? h.status}`);
    if (h.owner) parts.push(h.owner === 'none' ? 'left it with nobody' : h.owner === h.by ? 'took it' : `gave it to ${teamName(h.owner)}`);
    if (h.next_step !== undefined && h.next_step !== null) parts.push(h.next_step.trim() ? `set the next step: “${h.next_step.trim()}”` : 'cleared the next step');
    if (h.intro_queue !== undefined && h.intro_queue !== null) parts.push(h.intro_queue ? 'put them in the intro-call queue' : 'took them out of the intro-call queue');
    if (h.note && !h.note.startsWith('Added:')) parts.push(`“${h.note}”`);
    if (!parts.length) parts.push('changed what they’re good for');
    out.push({ at: h.at, text: `${by} ${parts.join('; ')}`, team: true });
  }
  for (const n of notes.value) out.push({ at: n.created_at, text: `${cap(teamName(n.author_id) || 'someone on the team')} wrote ${n.kind === 'call' ? 'call notes' : n.kind === 'review' ? 'a review' : n.kind === 'skill' ? 'a skill check' : 'a note'}`, team: true });
  return out.filter((x) => x.at).sort((a, b) => b.at.localeCompare(a.at));
});
</script>

<template>
  <aside class="rg teampanel" aria-label="Team only" data-teampanel>
    <div class="tp">
      <div class="row sp"><span class="teamtag"><Icon name="lock" :size="11" />Team only</span><span class="faint small">core and leads</span></div>
      <p class="warn small">{{ first }} never sees this panel. Write facts and what you saw.</p>
      <p v-if="err" class="err" role="alert" data-team-err>{{ err }}</p>
      <dl class="kv">
        <dt>Owner</dt>
        <dd>
          <div class="ownerrow">
            <select class="input sel" :value="o?.owner_id ?? ''" aria-label="Owner" :disabled="busy === 'owner'" data-owner-select @change="setOwner(($event.target as HTMLSelectElement).value)">
              <option value="">Nobody yet</option>
              <option v-for="m in owners" :key="m.id" :value="m.id">{{ m.id === me ? `${m.name} (you)` : m.name }}</option>
            </select>
            <button v-if="o?.owner_id !== me && me" class="btn sm" type="button" :disabled="!!busy" data-take @click="takeIt">Take it</button>
          </div>
        </dd>
        <dt>Status</dt>
        <dd>
          <div class="ownerrow">
            <StatusPill :status="o?.status ?? 'new'" />
            <select class="input sel" :value="o?.status ?? 'new'" aria-label="Status" :disabled="busy === 'status'" data-status-select @change="setStatus(($event.target as HTMLSelectElement).value as OutreachStatus)">
              <option v-for="(v, k) in STATUS" :key="k" :value="k">{{ v[0] }}</option>
            </select>
          </div>
        </dd>
        <dt><label for="next-step">Next step</label></dt>
        <dd>
          <textarea id="next-step" v-model="next" class="input nextstep" rows="2" maxlength="300" placeholder="None yet" data-next-step @keydown.enter.exact.prevent="nextDirty && saveNext()"></textarea>
          <div v-if="nextDirty" class="row"><button class="btn sm primary" type="button" :disabled="!!busy" data-save-next @click="saveNext">Save</button><button class="btn sm ghost" type="button" @click="next = o?.next_step ?? ''">Cancel</button></div>
        </dd>
        <dt>Good for</dt>
        <dd>
          <div class="chips">
            <span v-for="t in goodFor" :key="t" class="tag" data-goodfor>{{ t }}<button type="button" class="x" :aria-label="`Remove ${t}`" :disabled="!!busy" @click="dropTag(t)">×</button></span>
            <span v-if="!goodFor.length" class="faint">—</span>
          </div>
          <form class="addtag" @submit.prevent="addTag">
            <input v-model="newTag" class="input" maxlength="80" placeholder="Add: a project, a part, a build day" aria-label="Add what they're good for" data-goodfor-input />
            <button class="btn sm" type="submit" :disabled="!newTag.trim() || !!busy">Add</button>
          </form>
        </dd>
      </dl>
      <div class="row">
        <RouterLink class="btn sm teambtn" :to="{ path: '/community/reach-out', query: { person: p.id } }"><Icon name="video" :size="13" /> Invite to a call</RouterLink>
      </div>
    </div>

    <div v-if="showKnow" class="tp" data-know>
      <div class="row sp"><b class="h">What we know</b><span class="faint small">the team's, not {{ first }}'s</span></div>
      <dl v-if="!editingKnow" class="kv">
        <dt>Seems good at</dt>
        <dd>
          <div class="chips"><DisciplineChip v-for="d in p.guess?.disciplines ?? []" :key="d" :name="d" kind="guess" /></div>
          <span v-if="p.guess?.disciplines.length" class="faint small">{{ whose(p.added_by) }} guess</span>
          <span v-else class="faint">not known</span>
        </dd>
        <dt>Tools</dt><dd>{{ (p.guess?.tools ?? []).map((t) => TOOLS[t]).join(', ') || 'not known' }}</dd>
        <template v-if="p.source"><dt>From</dt><dd>{{ p.source }}</dd></template>
        <template v-if="p.added_by"><dt>Added by</dt><dd>{{ cap(teamName(p.added_by)) }}<template v-if="p.created_at">, {{ day(p.created_at) }}</template></dd></template>
      </dl>
      <div v-else class="knowform">
        <label class="label" for="k-source">Where we know them from</label>
        <input id="k-source" v-model="kSource" class="input" maxlength="300" />
        <p class="label">Seems good at (our guess)</p>
        <TaxonomyPicker v-model:can="kGuess" :cycle="false" label="Seems good at" />
        <p class="label">Tools</p>
        <div class="picks">
          <button v-for="(label, t) in TOOLS" :key="t" type="button" class="pick" :aria-pressed="kTools.includes(t)" @click="toggleTool(t)">{{ label }}</button>
        </div>
        <div class="row"><button class="btn sm primary" type="button" :disabled="!kSource.trim() || !!busy" @click="saveKnow">Save</button><button class="btn sm ghost" type="button" @click="editingKnow = false">Cancel</button></div>
      </div>
      <button v-if="!editingKnow && teamAdded(p)" class="btn sm ghost editknow" type="button" data-edit-know @click="editKnow">Edit what we know</button>
    </div>

    <div class="tp">
      <div class="row sp"><b class="h">Skills</b><span class="faint small">checked by the team</span></div>
      <div v-for="s in skills" :key="s.name" class="skillrow" data-skill>
        <DisciplineChip :name="s.name" :kind="s.kind" :checked="s.checked" />
        <span :class="s.checked ? 'ok' : 'faint'">{{ s.how }}</span>
        <span class="who">{{ s.who }}</span>
      </div>
      <p v-if="!skills.length" class="faint small pad">Nothing said or checked yet.</p>
    </div>

    <div class="tp">
      <div class="row sp"><b class="h">Notes</b><span class="faint small" data-note-count>{{ notes.length }}</span></div>
      <div v-for="n in notes" :key="n.id" class="tnote" data-note>
        <div class="by">
          <span class="k">{{ KIND[n.kind] }}</span>{{ cap(teamName(n.author_id) || 'someone on the team') }}
          <span class="d">{{ day(n.created_at) }}<template v-if="n.edited_at"> · edited</template></span>
        </div>
        <template v-if="editing === n.id">
          <textarea v-model="editBody" class="input" rows="4" aria-label="Edit the note" data-edit-body></textarea>
          <div class="row"><button class="btn sm primary" type="button" :disabled="!editBody.trim() || !!busy" data-save-edit @click="saveEdit(n)">Save</button><button class="btn sm ghost" type="button" @click="editing = ''">Cancel</button></div>
        </template>
        <template v-else>
          <p class="body">{{ n.body }}</p>
          <button v-if="canEdit(n)" class="edit" type="button" data-edit-note @click="startEdit(n)">Edit</button>
        </template>
      </div>
      <p v-if="!notes.length" class="faint small pad">No notes yet.</p>
      <div class="compose">
        <div class="seg" role="radiogroup" aria-label="Kind of note">
          <button v-for="(label, k) in KIND" :key="k" type="button" role="radio" :aria-checked="kind === k" :data-kind="k" @click="kind = k">{{ label }}</button>
        </div>
        <div v-if="kind === 'skill'" class="skillpick">
          <select v-model="sDiscipline" class="input sel" aria-label="Discipline" data-skill-discipline>
            <option value="" disabled>Discipline…</option>
            <optgroup v-if="disciplineOptions.theirs.length" :label="`${first}'s`"><option v-for="d in disciplineOptions.theirs" :key="d" :value="d">{{ d }}</option></optgroup>
            <optgroup label="All"><option v-for="d in disciplineOptions.rest" :key="d" :value="d">{{ d }}</option></optgroup>
          </select>
          <select v-model="sVerdict" class="input sel" aria-label="What you saw" data-skill-verdict>
            <option v-for="(label, k) in VERDICT" :key="k" :value="k">{{ label.charAt(0).toUpperCase() + label.slice(1) }}</option>
          </select>
        </div>
        <textarea v-model="body" class="input" rows="3" :placeholder="`What did you learn about ${first}? Facts and what you saw, not verdicts.`" aria-label="New note" data-note-body></textarea>
        <div class="row sp"><span class="faint small"><Icon name="lock" :size="11" /> core and leads</span><button class="btn sm teambtn" type="button" :disabled="!canPost" data-add-note @click="post">Add note</button></div>
      </div>
    </div>

    <div class="tp">
      <b class="h">History</b>
      <ul class="tl hist" data-history>
        <li v-for="(h, i) in history" :key="i" :class="{ t: h.team }"><span class="d">{{ day(h.at) }}</span>{{ h.text }}</li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.teampanel { border: 1px solid var(--team-line); border-radius: 12px; background: var(--team-bg); }
.tp { padding: 14px 16px; }
.tp + .tp { border-top: 1px solid var(--team-line); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; }
.row.sp { justify-content: space-between; margin-top: 0; }
.h { color: var(--fg); font-size: var(--text-nav); font-weight: 600; }
.warn { margin: 8px 0 0; color: var(--amber-12); }
.err { margin: 8px 0 0; }
.kv { margin-top: 12px; grid-template-columns: 86px minmax(0, 1fr); align-items: start; }
.kv dt { padding-top: 5px; }
.ownerrow { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.sel { width: auto; min-height: 28px; padding: 3px 8px; font-size: var(--text-base); }
.input { min-height: 30px; padding: 5px 9px; }
.tag .x { margin-left: 2px; padding: 0 2px; border: 0; background: none; color: var(--fg-faint); font: inherit; cursor: pointer; }
.tag .x:hover { color: var(--fg); }
.nextstep { resize: none; line-height: 1.45; }
.addtag { display: flex; gap: 6px; margin-top: 6px; }
.addtag .input { flex: 1; min-width: 0; }
.teambtn { border-color: var(--amber-a7); color: var(--amber-11); }
.teambtn:hover { border-color: var(--amber-a8); background: var(--amber-a3); color: var(--amber-12); }
.knowform { margin-top: 10px; }
.knowform .label { margin-top: 10px; }
.editknow { margin-top: 8px; }
.skillrow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 5px 0; }
.skillrow .ok { color: var(--jade-11); }
.skillrow .who { margin-left: auto; color: var(--fg-faint); font-size: var(--text-sm); }
.pad { padding: 8px 0 0; margin: 0; }
.tnote { position: relative; padding: 10px 0; border-bottom: 1px solid var(--amber-a3); }
.tnote .by { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--amber-12); font-size: var(--text-base); }
.tnote .k { padding: 3px 5px; border-radius: 4px; background: var(--amber-a3); color: var(--amber-11); font: 600 9.5px/1 var(--font-mono); letter-spacing: 0.06em; text-transform: uppercase; }
.tnote .d { margin-left: auto; color: var(--fg-faint); font-size: var(--text-sm); }
.tnote .body { margin: 5px 0 0; color: var(--fg-2); line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.tnote .edit { margin-top: 4px; padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.tnote .edit:hover { color: var(--fg); text-decoration: underline; }
.tnote textarea { margin-top: 6px; }
.compose { display: grid; gap: 8px; margin-top: 10px; }
.compose .seg { justify-self: start; }
.compose .seg button { height: 24px; padding: 0 8px; font-size: var(--text-sm); }
.skillpick { display: flex; flex-wrap: wrap; gap: 6px; }
.hist { margin-top: 8px; font-size: var(--text-base); }
</style>
