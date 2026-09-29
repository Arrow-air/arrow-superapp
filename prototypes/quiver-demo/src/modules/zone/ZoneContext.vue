<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Avatar from '../threads/Avatar.vue';
import { callItems } from '../../data/calls';
import { zoneById } from '../../data/zones';
import { issueByNumber, partById, prByNumber, issueUrl, prUrl, taskById, shortDate } from '../../data/quiver';
import { personByGithub, personById } from '../../data/people';
import { startThread, state } from '../threads/store';
import { zoneTab } from '../../frame/nav';

// What a zone already has before anyone opens a thread: its purpose, the
// GitHub work that touches it, and what the call notes said about it. Call
// items that are questions, proposals or gaps can start a discussion here.
const props = defineProps<{ zone: string }>();
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
// A call item is picked up once a thread (seeded or started here) carries it.
const threadFor = (id: string, seeded?: string) =>
  seeded ?? state.threads.find((t) => t.source?.kind === 'call' && t.source.ref === id && t.authorId === 'me')?.id;

function start(c: (typeof notes.value)[number]) {
  const t = startThread({
    zone: props.zone,
    context: zoneTab(props.zone)?.id ?? 'overview',
    title: c.text.length > 90 ? `${c.text.slice(0, 87).trimEnd()}…` : c.text,
    body: `From the ${c.call.date} call notes, which name ${c.who.map((w) => personById(w)?.name).join(' and ')}: ${c.text}`,
    type: c.kind === 'proposal' ? 'proposal' : 'question',
    fromCall: c.id,
  });
  router.replace({ query: { thread: t.id } });
}

const open = ref(true);
const ownerOf = (owner: string | null) => {
  if (!owner) return undefined;
  const first = owner.replace(/^@/, '').split(/[\s,(.]/)[0];
  return personById(first.toLowerCase()) ?? personByGithub(first);
};
</script>

<template>
  <section v-if="z" class="ctx" :class="{ closed: !open }" aria-label="Zone context">
    <div class="ctx-head">
      <p class="summary">{{ z.summary }}</p>
      <button class="toggle" type="button" :aria-expanded="open" @click="open = !open">{{ open ? 'Hide context' : 'Show context' }}</button>
    </div>

    <div v-if="open" class="ctx-body">
      <slot />

      <div v-if="hasWork" class="col">
        <h3 class="h">On GitHub</h3>
        <ul class="rows">
          <li v-for="t in tasks" :key="t!.id">
            <a :href="t!.url" target="_blank" rel="noopener" class="row">
              <span class="id mono">{{ t!.id }}</span>
              <span class="txt">{{ t!.title }}</span>
              <span class="meta">
                <Avatar v-if="ownerOf(t!.owner)" :id="ownerOf(t!.owner)!.id" :size="14" />
                <span v-if="t!.deadline" class="mono">{{ t!.deadline.slice(0, 10) }}</span>
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
                <span v-else-if="x.p?.author" class="muted">{{ x.p.author }}</span>
                <span v-if="x.p" class="muted">{{ shortDate(x.p.updatedAt) }}</span>
              </span>
            </a>
          </li>
          <li v-for="x in parts" :key="x.id">
            <RouterLink :to="{ path: '/quiver/design/bom', query: { part: x.id } }" class="row">
              <span class="id mono">{{ x.id }}</span>
              <span class="txt">{{ x.p?.name ?? 'Part' }}</span>
            </RouterLink>
          </li>
          <li v-for="l in z.links ?? []" :key="l.url">
            <a :href="l.url" target="_blank" rel="noopener" class="row">
              <span class="id mono">link</span><span class="txt">{{ l.label }}</span>
            </a>
          </li>
        </ul>
      </div>

      <div v-if="notes.length" class="col">
        <h3 class="h">From the call notes</h3>
        <ul class="notes">
          <li v-for="c in notes" :key="c.id" class="note">
            <span class="who">
              <Avatar v-for="w in c.who" :key="w" :id="w" :size="16" />
            </span>
            <div class="note-main">
              <p>
                <span class="kind" :data-kind="c.kind">{{ kindLabel[c.kind] }}</span>
                {{ c.text }}
              </p>
              <span class="note-meta">
                <RouterLink :to="{ path: '/quiver/overview/calls', query: { item: c.id } }" class="muted">{{ c.call.date }} call</RouterLink>
                <template v-if="threadFor(c.id, c.thread)">
                  <span class="dot">·</span>
                  <RouterLink :to="{ query: { thread: threadFor(c.id, c.thread) } }" class="link">In {{ threadFor(c.id, c.thread) }}</RouterLink>
                </template>
                <template v-else-if="startable(c)">
                  <span class="dot">·</span>
                  <button class="link btn" type="button" @click="start(c)">Start a discussion</button>
                </template>
              </span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ctx { padding: 14px 16px 12px; border-bottom: 1px solid var(--slate-a3); background: var(--slot-bg); }
.ctx-head { display: flex; align-items: flex-start; gap: 16px; }
.summary { flex: 1; margin: 0; max-width: 820px; color: var(--fg-2); font-size: var(--text-nav); line-height: 1.55; }
.toggle { flex: none; height: 22px; padding: 0 8px; border: 0; border-radius: 6px; background: var(--slate-a2); color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.toggle:hover { color: var(--fg); background: var(--slate-a3); }
.ctx-body { display: flex; flex-wrap: wrap; gap: 12px 28px; margin-top: 12px; max-height: 30vh; overflow-y: auto; scrollbar-width: thin; }
.ctx-body > * { flex: 1 1 360px; min-width: 0; }
.h { margin: 0 0 6px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.mono { font-family: var(--font-mono); }
.muted { color: var(--fg-muted); }
.rows, .notes { margin: 0; padding: 0; list-style: none; }
.row {
  display: flex; align-items: center; gap: 10px; padding: 5px 8px; margin: 0 -8px; border-radius: 7px;
  color: var(--fg-2); text-decoration: none; font-size: var(--text-base);
}
.row:hover { background: var(--slate-a2); color: var(--fg); }
.id { flex: none; min-width: 48px; font-size: var(--text-sm); color: var(--fg-muted); }
.txt { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { flex: none; display: inline-flex; align-items: center; gap: 6px; font-size: var(--text-sm); color: var(--fg-muted); }
.pill { height: 16px; padding: 0 5px; border-radius: 4px; background: var(--slate-a3); font-size: 11px; line-height: 16px; color: var(--fg-muted); }

.note { display: flex; gap: 10px; padding: 6px 0; }
.note + .note { border-top: 1px solid var(--slate-a2); }
.who { display: inline-flex; flex: none; padding-top: 2px; }
.who .av + .av { margin-left: -4px; }
.note-main { min-width: 0; }
.note-main p { margin: 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; }
.kind { margin-right: 4px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-muted); }
.kind[data-kind='question'], .kind[data-kind='gap'] { color: var(--amber-11); }
.kind[data-kind='proposal'] { color: var(--indigo-11); }
.kind[data-kind='agreement'] { color: var(--jade-11); }
.note-meta { display: inline-flex; align-items: center; gap: 0; margin-top: 2px; font-size: var(--text-sm); }
.note-meta a { text-decoration: none; }
.note-meta a:hover { text-decoration: underline; }
.dot { margin: 0 6px; color: var(--fg-faint); }
.link { color: var(--indigo-11); }
.btn { padding: 0; border: 0; background: none; font: inherit; cursor: pointer; }
.btn:hover { text-decoration: underline; }
</style>
