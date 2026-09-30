<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Avatar from '../threads/Avatar.vue';
import { callItems } from '../../data/calls';
import { zoneById } from '../../data/zones';
import { issueByNumber, partById, prByNumber, issueUrl, prUrl, taskById, shortDate } from '../../data/quiver';
import { personByGithub, personById } from '../../data/people';
import { startThread, state } from '../threads/store';

// What a zone already has around its threads: what the call notes said about
// it, and the GitHub work that touches it. Call questions, proposals and gaps
// can start a discussion right here.
const props = defineProps<{ zone: string }>();
const route = useRoute();
const router = useRouter();

const z = computed(() => zoneById(props.zone));
const tasks = computed(() => (z.value?.tasks ?? []).map(taskById).filter((t) => !!t));
const issues = computed(() => (z.value?.issues ?? []).map((n) => ({ n, i: issueByNumber(n) })));
const prs = computed(() => (z.value?.prs ?? []).map((n) => ({ n, p: prByNumber(n) })));
const parts = computed(() => (z.value?.parts ?? []).map((id) => ({ id, p: partById(id) })));
const hasWork = computed(() => tasks.value.length || issues.value.length || prs.value.length || parts.value.length || z.value?.links?.length);

const notes = computed(() => callItems.filter((c) => c.zone === props.zone));
const kindLabel = { update: 'Update', question: 'Question', proposal: 'Proposal', agreement: 'Agreed', gap: 'Gap' } as const;
const startable = (c: (typeof notes.value)[number]) => ['question', 'proposal', 'gap'].includes(c.kind);
const threadFor = (id: string, seeded?: string) =>
  seeded ?? state.threads.find((t) => t.source?.kind === 'call' && t.source.ref === id)?.id;
const openThread = (id: string) => router.replace({ query: { ...route.query, thread: id } });

function start(c: (typeof notes.value)[number]) {
  const t = startThread({
    zone: props.zone,
    title: c.text.length > 90 ? `${c.text.slice(0, 87).trimEnd()}…` : c.text,
    body: `From the ${c.call.date} call notes, which name ${c.who.map((w) => personById(w)?.name).join(' and ')}: ${c.text}`,
    type: c.kind === 'proposal' ? 'proposal' : 'question',
    fromCall: c.id,
  });
  openThread(t.id);
}
const ownerOf = (owner: string | null) => {
  if (!owner || /^open/i.test(owner)) return undefined;
  const first = owner.replace(/^@/, '').split(/[\s,(.]/)[0];
  return personById(first.toLowerCase()) ?? personByGithub(first);
};
</script>

<template>
  <section v-if="notes.length" class="sec">
    <h2 class="sec-h">From the call notes</h2>
    <ul class="notes">
      <li v-for="c in notes" :key="c.id" class="note">
        <span class="who"><Avatar v-for="w in c.who" :key="w" :id="w" :size="16" /></span>
        <div class="note-main">
          <p><span class="kind" :data-kind="c.kind">{{ kindLabel[c.kind] }}</span> {{ c.text }}</p>
          <span class="note-meta">
            <RouterLink :to="{ path: '/quiver/overview/calls', query: { item: c.id } }" class="muted">{{ c.call.date }} call</RouterLink>
            <template v-if="threadFor(c.id, c.thread)">
              <span class="dot">·</span>
              <button class="link btn" type="button" @click="openThread(threadFor(c.id, c.thread)!)">Open {{ threadFor(c.id, c.thread) }}</button>
            </template>
            <template v-else-if="startable(c)">
              <span class="dot">·</span>
              <button class="link btn" type="button" @click="start(c)">Start a discussion</button>
            </template>
          </span>
        </div>
      </li>
    </ul>
  </section>

  <section v-if="z && hasWork" class="sec">
    <h2 class="sec-h">On GitHub</h2>
    <ul class="rows">
      <li v-for="t in tasks" :key="t!.id">
        <a :href="t!.url" target="_blank" rel="noopener" class="row">
          <span class="id mono">{{ t!.id }}</span>
          <span class="txt">{{ t!.title }}</span>
          <span class="meta">
            <Avatar v-if="ownerOf(t!.owner)" :id="ownerOf(t!.owner)!.id" :size="14" />
            <span v-if="t!.claimable" class="pill ok">Claimable</span>
          </span>
        </a>
      </li>
      <li v-for="x in issues" :key="x.n">
        <a :href="issueUrl(x.n)" target="_blank" rel="noopener" class="row">
          <span class="id mono">#{{ x.n }}</span>
          <span class="txt">{{ x.i?.title ?? 'Issue' }}</span>
        </a>
      </li>
      <li v-for="x in prs" :key="x.n">
        <a :href="prUrl(x.n)" target="_blank" rel="noopener" class="row">
          <span class="id mono">PR {{ x.n }}</span>
          <span class="txt">{{ x.p?.title ?? 'Pull request (closed or merged)' }}</span>
          <span class="meta">
            <span v-if="x.p?.draft" class="pill">Draft</span>
            <Avatar v-if="personByGithub(x.p?.author)" :id="personByGithub(x.p?.author)!.id" :size="14" />
            <span v-if="x.p" class="muted">{{ shortDate(x.p.updatedAt) }}</span>
          </span>
        </a>
      </li>
      <li v-for="x in parts" :key="x.id">
        <RouterLink :to="{ path: '/quiver/build/bom', query: { part: x.id } }" class="row">
          <span class="id mono">{{ x.id }}</span>
          <span class="txt">{{ x.p?.name ?? 'Part' }}</span>
          <span class="meta muted">BOM</span>
        </RouterLink>
      </li>
      <li v-for="l in z.links ?? []" :key="l.url">
        <a :href="l.url" target="_blank" rel="noopener" class="row">
          <span class="id mono">doc</span><span class="txt">{{ l.label }}</span>
        </a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.sec { margin-top: 30px; }
.sec-h { margin: 0 0 6px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.mono { font-family: var(--font-mono); }
.muted { color: var(--fg-muted); }
.rows, .notes { margin: 0; padding: 0; list-style: none; }
.row {
  display: flex; align-items: center; gap: 12px; padding: 7px 12px; border-top: 1px solid var(--slate-a3);
  color: var(--fg-2); text-decoration: none; font-size: var(--text-base);
}
.rows li:first-child .row { border-top: 0; }
.row:hover { background: var(--slate-a2); color: var(--fg); }
.id { flex: none; min-width: 52px; font-size: var(--text-sm); color: var(--fg-muted); }
.txt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { flex: none; display: inline-flex; align-items: center; gap: 6px; font-size: var(--text-sm); }
.pill { height: 16px; padding: 0 5px; border-radius: 4px; background: var(--slate-a3); font-size: 11px; line-height: 16px; color: var(--fg-muted); }
.pill.ok { background: var(--jade-a3); color: var(--jade-11); }
.note { display: flex; gap: 12px; padding: 9px 12px; border-top: 1px solid var(--slate-a3); }
.notes li:first-child { border-top: 0; }
.who { display: inline-flex; flex: none; padding-top: 2px; }
.who .av + .av { margin-left: -4px; }
.note-main { min-width: 0; }
.note-main p { margin: 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; }
.kind { margin-right: 4px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-muted); }
.kind[data-kind='question'], .kind[data-kind='gap'] { color: var(--amber-11); }
.kind[data-kind='proposal'] { color: var(--indigo-11); }
.kind[data-kind='agreement'] { color: var(--jade-11); }
.note-meta { display: inline-flex; align-items: center; margin-top: 3px; font-size: var(--text-sm); }
.note-meta a { text-decoration: none; }
.note-meta a:hover { text-decoration: underline; }
.dot { margin: 0 6px; color: var(--fg-faint); }
.link { color: var(--indigo-11); }
.btn { padding: 0; border: 0; background: none; font: inherit; cursor: pointer; }
.btn:hover { text-decoration: underline; }
</style>
