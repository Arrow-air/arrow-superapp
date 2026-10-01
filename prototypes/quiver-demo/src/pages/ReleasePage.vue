<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThreadRows from '../modules/threads/ThreadRows.vue';
import StatusIcon from '../modules/threads/StatusIcon.vue';
import { LATER, NEXT, type Thread } from '../modules/threads/data';
import { session } from '../lib/session';
import {
  V11_ZONES, letterOf, byActivity, day, deferOpen, freezeRelease, isOpen, person, retroPreview, setReleasePlan, startThread, state, statusOf, workFor,
} from '../modules/threads/store';
import { callItems } from '../data/calls';
import { remote } from '../lib/backend';
import { zoneLabel, zonePath } from '../frame/nav';

// The next Dev Kit revision in one place. Every thread aimed at v1.1 shows
// here, grouped by where it changes the aircraft, wherever it lives. Each
// improvement is decided in its own thread; decided ones are the change list.
const route = useRoute();
const router = useRouter();

const v11 = computed(() => state.threads.filter((t) => t.version === NEXT));
const open = computed(() => v11.value.filter(isOpen));
const declined = computed(() => v11.value.filter((t) => t.declined));
const deferred = computed(() => state.threads.filter((t) => t.deferrals?.some((d) => d.from === NEXT)));
const showDeclined = ref(false);
const decided = computed(() => v11.value.filter((t) => t.settled).sort((a, b) => a.settled!.decision.localeCompare(b.settled!.decision)));
const converging = computed(() => open.value.filter((t) => statusOf(t) === 'converging').length);

// The four next-revision zones always show, even empty; any other zone with a
// v1.1 thread (the attachment interface, say) follows.
const zones = computed(() => [...V11_ZONES, ...new Set(open.value.map((t) => t.zone).filter((z) => !V11_ZONES.includes(z)))]);
const openIn = (zone: string) => open.value.filter((t) => t.zone === zone).sort(byActivity);

// Call questions in these zones that no thread has picked up yet.
const raised = computed(() =>
  callItems.filter((c) => zones.value.includes(c.zone) && ['question', 'proposal', 'gap'].includes(c.kind) && !c.thread && !state.threads.some((t) => t.source?.kind === 'call' && t.source.ref === c.id)),
);

const composing = ref(false);
const draft = ref({ zone: V11_ZONES[0], title: '', body: '' });
const where = [...V11_ZONES, 'interface'];
function proposeIn(zone: string) {
  draft.value.zone = zone;
  composing.value = true;
  requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.rel-form .nf-title')?.focus());
}
async function create() {
  if (!draft.value.title.trim()) return;
  const t = await startThread({ zone: draft.value.zone, title: draft.value.title.trim(), body: draft.value.body.trim(), type: 'proposal', version: NEXT });
  draft.value = { zone: draft.value.zone, title: '', body: '' };
  composing.value = false;
  if (t) router.replace({ query: { ...route.query, thread: t.id } });
}
const letter = (t: Thread, id: string) => letterOf(t, id);
const stageLabel = { draft: 'Draft', open: 'Open', in_progress: 'In progress', in_review: 'In review', completed: 'Accepted' } as const;

// Freeze and retro pool, as the spec workspace does it.
const isLead = computed(() => state.role === 'lead');
const frozen = computed(() => !!state.release.frozenAt);
const plan = ref({ pool: state.release.pool ?? ('' as number | ''), date: state.release.freezeTarget ?? '' });
const savePlan = () => setReleasePlan({ pool: plan.value.pool === '' ? undefined : Number(plan.value.pool), freezeTarget: plan.value.date || undefined });
const retro = computed(() => retroPreview());
// Who a retro line pays: you, a person named in the notes (held until a lead
// confirms), or a document with no person named (held).
function recipient(r: string) {
  if (r === 'me') return { name: 'You', held: false, note: '' };
  if (session.members[r]) return { name: session.members[r].display_name, held: false, note: '' };
  if (r.startsWith('source:')) return { name: `From ${r.slice(7)}`, held: true, note: 'no person named' };
  return { name: person(r)?.name ?? r, held: true, note: 'named in the notes' };
}
function freeze() {
  if (confirm(`Freeze ${NEXT}? The spec locks, the retro split is recorded, and new proposals go to ${LATER}.`)) freezeRelease();
}
function deferRest() {
  if (confirm(`Defer all ${open.value.length} open ${NEXT} threads to ${LATER}?`)) deferOpen(`Not settled before the ${NEXT} freeze.`);
}
</script>

<template>
  <div class="zp">
    <header class="zp-head">
      <h1 class="zp-title">{{ NEXT }} <span class="chip">Working name</span></h1>
      <p class="zp-sum">
        The next revision of the Quiver Dev Kit. Every improvement proposed for it is collected here, by where it changes the aircraft.
        Each one is weighed and decided in its own thread; the decided ones make up the v1.1 change list.
      </p>
      <p v-if="frozen" class="frozen">Frozen {{ day(state.release.frozenAt!) }} by {{ state.release.frozenBy === 'me' ? 'you' : state.release.frozenBy }}. The spec below is locked and the retro split is recorded; new proposals go to {{ LATER }}.</p>
      <div class="stats">
        <span v-if="state.release.pool"><b>{{ state.release.pool.toLocaleString('en-US') }}</b> ARROW retro pool</span>
        <span v-if="state.release.freezeTarget">freeze <b>{{ day(state.release.freezeTarget) }}</b></span>
        <span><b>{{ open.length }}</b> proposed</span>
        <span><b>{{ converging }}</b> converging</span>
        <span><b>{{ decided.length }}</b> decided</span>
        <RouterLink to="/quiver/overview/model" class="model-link">Pick a part in the 3D model</RouterLink>
        <button v-if="!composing" class="new-btn" type="button" @click="proposeIn(V11_ZONES[0])">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg> Propose an improvement
        </button>
      </div>
    </header>

    <form v-if="composing" class="new-form rel-form" @submit.prevent="create">
      <label class="where">
        <span>Where</span>
        <select v-model="draft.zone" aria-label="Where the change is">
          <option v-for="z in where" :key="z" :value="z">{{ zoneLabel(z) }}</option>
        </select>
      </label>
      <input v-model="draft.title" class="nf-title" placeholder="The change, in one line" aria-label="Improvement" />
      <textarea v-model="draft.body" rows="3" placeholder="Why: what it fixes, what it costs, what it touches" aria-label="Why"></textarea>
      <div class="nf-bar">
        <span class="hint">Opens as a {{ NEXT }} proposal in {{ zoneLabel(draft.zone) }}.</span>
        <span class="nf-actions">
          <button class="ghost" type="button" @click="composing = false">Cancel</button>
          <button class="primary" type="submit" :disabled="!draft.title.trim()">Propose</button>
        </span>
      </div>
    </form>

    <section v-for="z in zones" :key="z" class="grp">
      <div class="grp-head">
        <RouterLink :to="zonePath(z)" class="grp-name">{{ zoneLabel(z) }}</RouterLink>
        <span class="grp-count">{{ openIn(z).length ? `${openIn(z).length} open` : '' }}</span>
        <button class="add" type="button" :title="`Propose an improvement to ${zoneLabel(z)}`" @click="proposeIn(z)">+ Propose</button>
      </div>
      <div v-if="openIn(z).length" class="list"><ThreadRows :threads="openIn(z)" /></div>
      <p v-else class="none">Nothing proposed yet.</p>
    </section>

    <section v-if="raised.length" class="grp">
      <h2 class="sec-h">Raised on calls, no thread yet</h2>
      <ul class="raised">
        <li v-for="c in raised" :key="c.id">
          <span class="muted">{{ zoneLabel(c.zone) }}</span> {{ c.text }}
          <RouterLink :to="{ path: '/quiver/overview/calls', query: { item: c.id } }" class="muted">{{ c.call.date }} call</RouterLink>
        </li>
      </ul>
    </section>

    <section class="grp">
      <h2 class="sec-h">The {{ NEXT }} spec: decided</h2>
      <ol v-if="decided.length" class="changes">
        <li v-for="t in decided" :key="t.id">
          <button type="button" class="change" @click="router.replace({ query: { ...route.query, thread: t.id } })">
            <StatusIcon status="settled" :override="t.settled?.override" :size="12" />
            <span class="mono">{{ t.settled!.decision }}</span>
            <span class="c-main">
              <span class="c-title">{{ t.title }}</span>
              <span class="c-choice">{{ letter(t, t.settled!.positionId) }}: {{ t.positions.find((p) => p.id === t.settled!.positionId)?.text }}</span>
              <span class="c-work">
                <template v-if="workFor(t)">{{ workFor(t)!.id }} · {{ workFor(t)!.kind === 'bounty' ? 'Bounty' : 'Grant' }} · {{ stageLabel[workFor(t)!.stage] }} · {{ workFor(t)!.reward.toLocaleString('en-US') }} ARROW</template>
                <template v-else>Not funded yet</template>
              </span>
            </span>
            <span class="muted">{{ zoneLabel(t.zone) }} · {{ day(t.settled!.at) }}</span>
          </button>
        </li>
      </ol>
      <p v-else class="none">Nothing decided yet. When a lead adopts a position on any thread above, it lands here; from here it can be funded as a bounty or grant.</p>
      <p v-if="declined.length || deferred.length" class="aside">
        <button v-if="declined.length" class="add" type="button" @click="showDeclined = !showDeclined">{{ declined.length }} declined</button>
        <span v-if="deferred.length" class="muted">{{ deferred.length }} deferred to {{ LATER }}</span>
      </p>
      <div v-if="showDeclined" class="list"><ThreadRows :threads="declined" /></div>
    </section>

    <section class="grp retro">
      <h2 class="sec-h">Retro pool and freeze</h2>
      <p class="expl">
        A pool of ARROW set aside for this version's discussion. At the freeze it is split across every position on a {{ NEXT }} thread by weighted net support, adopted or not, so good ideas that lost still earn. Nothing is paid from the app.
      </p>
      <form v-if="isLead && !frozen" class="plan" @submit.prevent="savePlan">
        <label>Pool <input v-model.number="plan.pool" type="number" min="0" step="100" placeholder="ARROW" aria-label="Retro pool in ARROW" /> ARROW</label>
        <label>Freeze on <input v-model="plan.date" type="date" aria-label="Freeze date" /></label>
        <button class="secondary" type="submit">Save plan</button>
      </form>
      <p v-else-if="!state.release.pool" class="none">No retro pool set yet. A lead sets the pool and the freeze date.</p>

      <div v-if="state.release.pool" class="alloc">
        <p class="alloc-h">{{ frozen ? 'Recorded split' : 'If it froze now' }}<span class="muted"> · {{ retro.amount.toLocaleString('en-US') }} ARROW{{ frozen ? '' : remote ? ', from the current votes' : ', from the votes in this browser' }}</span></p>
        <table v-if="retro.lines.length" class="vt">
          <tbody>
            <tr v-for="l in retro.lines" :key="l.recipient">
              <td>{{ recipient(l.recipient).name }}<span v-if="recipient(l.recipient).held" class="held"> · {{ recipient(l.recipient).note }}, held until a lead confirms</span></td>
              <td class="muted">{{ l.items.length }} {{ l.items.length === 1 ? 'position' : 'positions' }}</td>
              <td class="num"><b>{{ l.amount.toLocaleString('en-US') }}</b></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="none">No position on a {{ NEXT }} thread has net support yet, so nothing would be split.</p>
        <p v-if="retro.lines.length && retro.unallocated" class="muted small">{{ retro.unallocated }} ARROW unallocated.</p>
      </div>

      <div v-if="isLead && !frozen" class="freeze">
        <p v-if="open.length" class="expl">
          To freeze, every {{ NEXT }} thread needs an outcome: adopted, declined, or deferred to {{ LATER }}. {{ open.length }} still open.
          <button class="add" type="button" @click="deferRest">Defer the rest to {{ LATER }}</button>
        </p>
        <button class="primary" type="button" :disabled="open.length > 0" @click="freeze">Freeze {{ NEXT }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.zp { max-width: 880px; padding: 24px 28px 64px; }
.zp-title { display: flex; align-items: center; gap: 10px; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; color: var(--fg); }
.chip { height: 20px; padding: 0 7px; border-radius: 6px; background: var(--slate-a3); color: var(--fg-muted); font-size: var(--text-sm); font-weight: 500; line-height: 20px; letter-spacing: 0; }
.zp-sum { margin: 8px 0 0; max-width: 720px; color: var(--fg-2); font-size: var(--text-nav); line-height: 1.6; }
.stats { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-top: 14px; font-size: var(--text-base); color: var(--fg-muted); }
.stats b { color: var(--fg); font-weight: 600; }
.new-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 28px; margin-left: auto; padding: 0 12px; border: 0; border-radius: 8px;
  background: var(--indigo-9); color: #fff; font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
}
.new-btn:hover { background: var(--indigo-10); }
.model-link { margin-left: auto; color: var(--indigo-11); font-size: var(--text-sm); text-decoration: none; }
.model-link:hover { text-decoration: underline; }
.model-link + .new-btn { margin-left: 0; }
.new-btn svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.new-form { display: grid; gap: 8px; margin-top: 16px; padding: 12px; border: 1px solid var(--slate-a5); border-radius: 12px; background: var(--slate-a2); }
.where { display: inline-flex; align-items: center; gap: 8px; font-size: var(--text-sm); color: var(--fg-muted); }
.where select { height: 26px; padding: 0 8px; border: 1px solid var(--slate-a5); border-radius: 7px; background: var(--surface); color: var(--fg); font: inherit; font-size: var(--text-sm); }
.new-form input, .new-form textarea { width: 100%; border: 0; background: none; color: var(--fg); font: inherit; outline: none; resize: vertical; }
.nf-title { font-size: 15px; font-weight: 500; }
.new-form textarea { font-size: var(--text-nav); color: var(--fg-2); line-height: 1.5; }
.new-form ::placeholder { color: var(--fg-faint); }
.nf-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hint { font-size: var(--text-sm); color: var(--fg-faint); }
.nf-actions { display: inline-flex; align-items: center; gap: 10px; }
.ghost { padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.ghost:hover { color: var(--fg); }
.primary { height: 30px; padding: 0 14px; border: 0; border-radius: 8px; background: var(--indigo-9); color: #fff; font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer; }
.primary:disabled { opacity: 0.4; cursor: default; }
.grp { margin-top: 26px; }
.grp-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
.grp-name { color: var(--fg); font-size: var(--text-nav); font-weight: 600; text-decoration: none; }
.grp-name:hover { text-decoration: underline; }
.grp-count { font-size: var(--text-sm); color: var(--fg-muted); }
.add { margin-left: auto; padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.add:hover { text-decoration: underline; }
.list { border: 1px solid var(--slate-a4); border-radius: 12px; overflow: hidden; }
.none { margin: 0; padding: 12px 14px; border: 1px dashed var(--slate-a4); border-radius: 12px; color: var(--fg-faint); font-size: var(--text-base); }
.sec-h { margin: 0 0 8px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.muted { color: var(--fg-muted); }
.mono { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-muted); }
.raised { margin: 0; padding: 0; list-style: none; }
.raised li { display: flex; gap: 8px; padding: 6px 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; }
.raised a { flex: none; text-decoration: none; }
.changes { margin: 0; padding: 0; list-style: none; border: 1px solid var(--slate-a4); border-radius: 12px; overflow: hidden; }
.changes li + li .change { border-top: 1px solid var(--slate-a3); }
.change { display: flex; align-items: flex-start; gap: 10px; width: 100%; padding: 10px 12px; border: 0; background: none; text-align: left; font: inherit; color: inherit; cursor: pointer; }
.change:hover { background: var(--slate-a2); }
.change :deep(.st) { margin-top: 3px; flex: none; }
.c-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.c-title { color: var(--fg); font-size: var(--text-nav); font-weight: 500; }
.c-choice { color: var(--jade-11); font-size: var(--text-base); }
.c-work { color: var(--fg-muted); font-size: var(--text-sm); }
.frozen { margin: 10px 0 0; padding: 8px 12px; border: 1px solid var(--jade-a5); border-radius: 10px; background: var(--jade-a2, transparent); color: var(--jade-11); font-size: var(--text-base); }
.aside { display: flex; gap: 14px; margin: 8px 0 0; font-size: var(--text-sm); }
.aside .add { margin-left: 0; }
.retro .expl { margin: 0 0 10px; max-width: 720px; color: var(--fg-2); font-size: var(--text-base); line-height: 1.55; }
.retro .expl .add { margin-left: 6px; }
.plan { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; font-size: var(--text-sm); color: var(--fg-muted); }
.plan label { display: inline-flex; align-items: center; gap: 6px; }
.plan input { height: 28px; padding: 0 8px; border: 1px solid var(--slate-a5); border-radius: 7px; background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-base); }
.plan input[type='number'] { width: 110px; }
.secondary { height: 28px; padding: 0 12px; border: 1px solid var(--slate-a5); border-radius: 7px; background: none; color: var(--fg-2); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.alloc { margin-top: 14px; }
.alloc-h { margin: 0 0 6px; font-size: var(--text-base); color: var(--fg); font-weight: 500; }
.held { color: var(--amber-11); font-size: var(--text-sm); }
.freeze { margin-top: 16px; }
.small { font-size: var(--text-sm); }
@media (max-width: 767px) { .zp { padding: 16px; } .new-btn { margin-left: 0; } }
</style>
