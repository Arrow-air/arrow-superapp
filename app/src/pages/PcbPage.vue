<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThreadRows from '../modules/threads/ThreadRows.vue';
import NewThread from '../modules/threads/NewThread.vue';
import { NEXT, type ThreadType } from '../modules/threads/data';
import { isOpen, openVersion, startThread, state, threadsOnComponent } from '../modules/threads/store';
import { boardById, boardZone, boards, groupOf, groupsOf, naturalRef, pcbCommit } from '../data/pcbs';
import { partById } from '../data/quiver';
import { zoneIcon, zoneLabel, zonePath } from '../frame/nav';

// The PCBs on Quiver, rendered from their KiCad files with KiCanvas. Click a
// component on the board, or pick it from the list, to see its threads or
// propose a change for v1.1. The thread is anchored to board and reference.
const route = useRoute();
const router = useRouter();
const boardId = computed(() => (route.query.board as string) || boards[0].id);
const board = computed(() => boardById(boardId.value) ?? boards[0]);
const selectedRef = computed(() => (route.query.ref as string | undefined) ?? null);
const selected = computed(() => (selectedRef.value ? board.value.footprints.find((f) => f.ref === selectedRef.value) : undefined));
const go = (q: Record<string, string | undefined>) => {
  const next = { ...route.query, ...q };
  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
  router.replace({ query: next as Record<string, string> });
};
const pickBoard = (id: string) => go({ board: id, ref: undefined });
const pick = (ref: string | null) => go({ ref: ref ?? undefined });

// Component list, grouped; resistors and capacitors start folded.
const openGroups = ref<Set<string>>(new Set(['ic', 'conn']));
const toggle = (id: string) => { const s = new Set(openGroups.value); s.has(id) ? s.delete(id) : s.add(id); openGroups.value = s; };
const groups = computed(() =>
  groupsOf.map((g) => ({ ...g, items: board.value.footprints.filter((f) => groupOf(f.ref) === g.id).sort(naturalRef) })).filter((g) => g.items.length),
);
const openOn = (ref: string) => state.threads.filter((t) => t.pcb?.board === board.value.id && t.pcb.ref === ref && isOpen(t)).length;
const threads = computed(() => (selectedRef.value ? threadsOnComponent(board.value.id, selectedRef.value) : []));

// KiCanvas: load the web component once; its select event names the footprint.
const host = ref<HTMLElement>();
const ready = ref(!!customElements.get('kicanvas-embed'));
onMounted(() => {
  if (!ready.value) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = `${import.meta.env.BASE_URL}vendor/kicanvas.js`;
    document.head.appendChild(s);
    customElements.whenDefined('kicanvas-embed').then(() => (ready.value = true));
  }
  host.value?.addEventListener('kicanvas:select', onSelect as EventListener);
});
onBeforeUnmount(() => host.value?.removeEventListener('kicanvas:select', onSelect as EventListener));
// A click on the board selects there already; only list picks move the view.
let fromBoard = false;
function onSelect(e: Event) {
  const ref = (e as CustomEvent<{ item?: { reference?: string } | null }>).detail?.item?.reference;
  if (ref && ref !== selectedRef.value && board.value.footprints.some((f) => f.ref === ref)) {
    fromBoard = true;
    pick(ref);
  }
}

// KiCanvas keeps its board viewer inside shadow DOM. Once the board has
// loaded: fit the board rather than the drawing sheet, drop the "click to
// interact" overlay (this page has no scroll to protect), and keep the
// highlighted footprint in step with the list.
interface KcViewer extends EventTarget { board?: unknown; select(ref: string | null): void; zoom_to_board(): void; zoom_to_selection(): void; draw(): void }
let viewer: KcViewer | null = null;
function deepFind<T>(root: ParentNode, test: (el: Element) => T | undefined): T | undefined {
  for (const el of Array.from(root.querySelectorAll('*'))) {
    const hit = test(el);
    if (hit) return hit;
    if (el.shadowRoot) {
      const inner = deepFind(el.shadowRoot, test);
      if (inner) return inner;
    }
  }
  return undefined;
}
let poll = 0;
function attachViewer() {
  viewer?.removeEventListener('kicanvas:select', onSelect);
  viewer = null;
  clearInterval(poll);
  let tries = 0;
  poll = window.setInterval(() => {
    tries++;
    const v = host.value && deepFind<KcViewer>(host.value, (el) => {
      const cand = (el as unknown as { viewer?: KcViewer }).viewer;
      return cand && typeof cand.zoom_to_board === 'function' ? cand : undefined;
    });
    if (v?.board) {
      clearInterval(poll);
      viewer = v;
      v.addEventListener('kicanvas:select', onSelect);
      try { v.zoom_to_board(); v.draw(); } catch { /* older viewer: keep the page view */ }
      if (host.value) deepFind(host.value, (el) => (el.tagName === 'KC-UI-FOCUS-OVERLAY' ? (el.remove(), true) : undefined));
      highlight(selectedRef.value);
    } else if (tries > 60) clearInterval(poll);
  }, 250);
}
function highlight(ref: string | null) {
  if (!viewer) return;
  if (fromBoard) { fromBoard = false; return; }
  try {
    viewer.select(ref);
    if (ref) viewer.zoom_to_selection(); else viewer.zoom_to_board();
    viewer.draw();
  } catch { /* the reference may not be drawable */ }
}
watch(ready, (r) => r && requestAnimationFrame(attachViewer), { immediate: true });
// Let go of the old board's viewer at once, before it is torn down mid-draw.
watch(boardId, () => { viewer?.removeEventListener('kicanvas:select', onSelect); viewer = null; requestAnimationFrame(attachViewer); }, { flush: 'sync' });
watch(selectedRef, (r) => highlight(r));
onBeforeUnmount(() => { clearInterval(poll); viewer?.removeEventListener('kicanvas:select', onSelect); });

const composing = ref(false);
// What the thread is about: the component, or the whole board.
const about = ref<'ref' | 'board'>('ref');
watch([selectedRef, boardId], () => { composing.value = false; about.value = 'ref'; });
async function propose(d: { type: ThreadType; title: string; body: string; key: string }): Promise<boolean> {
  if (!selected.value) return false;
  const t = await startThread({
    zone: boardZone[board.value.id],
    part: board.value.part,
    pcb: about.value === 'ref' ? { board: board.value.id, ref: selected.value.ref } : undefined,
    title: d.title,
    body: d.body,
    type: d.type,
    version: NEXT,
    key: d.key,
  });
  if (!t) return false;
  composing.value = false;
  if (t) go({ thread: t.id });
  return true;
}
const src = computed(() => `${import.meta.env.BASE_URL}${board.value.file}`);
const githubFile = computed(() => `https://github.com/Arrow-air/project-quiver/blob/main/${board.value.path}`);
</script>

<template>
  <div class="pp">
    <aside class="side">
      <div class="boards" role="tablist" aria-label="Board">
        <button v-for="b in boards" :key="b.id" type="button" role="tab" :aria-selected="b.id === board.id" :title="b.name" @click="pickBoard(b.id)">{{ b.short }}</button>
      </div>

      <template v-if="selected">
        <button class="back" type="button" @click="pick(null)">← {{ board.name }}</button>
        <div class="c-ref mono">{{ selected.ref }}</div>
        <h1 class="c-name">{{ selected.value && selected.value !== '~' ? selected.value : selected.footprint }}</h1>
        <dl class="facts">
          <dt>Footprint</dt><dd>{{ selected.footprint }}</dd>
          <template v-if="selected.description"><dt>Description</dt><dd>{{ selected.description }}</dd></template>
          <dt>Side</dt><dd>{{ selected.layer.startsWith('B') ? 'Bottom' : 'Top' }}</dd>
          <dt>Board</dt><dd>{{ board.name }}</dd>
          <dt>Discussed in</dt><dd><RouterLink :to="zonePath(boardZone[board.id])">{{ zoneLabel(boardZone[board.id]) }}</RouterLink></dd>
        </dl>
        <button v-if="!composing" class="propose" type="button" @click="composing = true">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3.5h10v7H7l-3 2.5v-2.5H3z" /></svg> Start a thread about <b>{{ selected.ref }}</b>
        </button>
        <NewThread
          v-else
          v-model:scope="about"
          class="nt"
          :where="zoneLabel(boardZone[board.id])"
          :where-icon="zoneIcon(boardZone[board.id])"
          :scopes="[{ key: 'ref', label: selected.ref }, { key: 'board', label: board.short }]"
          type="proposal"
          :version="openVersion()"
          :title-hint="{ proposal: `What should change about ${about === 'ref' ? selected.ref : 'the board'}?` }"
          body-hint="Why: what it fixes, what it costs, what else on the board it touches"
          :draft-key="`new:pcb:${board.id}:${selected.ref}`"
          :submit="propose"
          @cancel="composing = false"
        />
        <h2 class="h">Threads about {{ selected.ref }}</h2>
        <div v-if="threads.length" class="list"><ThreadRows :threads="threads" /></div>
        <p v-else class="none">None yet.</p>
      </template>

      <template v-else>
        <h1 class="title">{{ board.name }}</h1>
        <p class="lede">
          Click a component on the board, or pick one below, to see what's being discussed about it or propose a change for {{ NEXT }}.
          BOM <span class="mono">{{ board.part }}</span> {{ partById(board.part)?.name }}.
        </p>
        <h2 class="h">Components <span class="n">{{ board.footprints.length }}</span></h2>
        <section v-for="g in groups" :key="g.id" class="grp">
          <button class="g-head" type="button" :aria-expanded="openGroups.has(g.id)" @click="toggle(g.id)">
            <svg viewBox="0 0 16 16" aria-hidden="true" :class="{ open: openGroups.has(g.id) }"><path d="m6 4 4 4-4 4" /></svg>
            {{ g.label }} <span class="n">{{ g.items.length }}</span>
          </button>
          <ul v-if="openGroups.has(g.id)" class="parts">
            <li v-for="f in g.items" :key="f.ref">
              <button class="part" type="button" :data-ref="f.ref" @click="pick(f.ref)">
                <span class="mono">{{ f.ref }}</span>
                <span class="pn">{{ f.value && f.value !== '~' ? f.value : f.footprint }}</span>
                <span v-if="openOn(f.ref)" class="badge">{{ openOn(f.ref) }}</span>
              </button>
            </li>
          </ul>
        </section>
        <p class="src">
          From <a :href="githubFile" target="_blank" rel="noopener">{{ board.path.split('/').pop() }}</a> on project-quiver main ({{ pcbCommit }}), drawn by KiCanvas.
        </p>
      </template>
    </aside>

    <div ref="host" class="stage" :data-ready="ready ? 'true' : undefined">
      <kicanvas-embed v-if="ready" :key="board.id" :src="src" controls="basic" theme="kicad"></kicanvas-embed>
      <p v-else class="loading">Loading the board viewer…</p>
    </div>
  </div>
</template>

<style scoped>
.pp { display: grid; grid-template-columns: 320px minmax(0, 1fr); height: 100%; min-height: 520px; }
.side { min-height: 0; overflow-y: auto; padding: 16px 18px 32px; border-right: 1px solid var(--slate-a3); scrollbar-width: thin; }
.stage { position: relative; min-height: 0; background: #001023; }
.stage kicanvas-embed { display: block; width: 100%; height: 100%; }
.loading { position: absolute; inset: 0; display: grid; place-items: center; margin: 0; color: #9fb3c8; font-size: var(--text-base); }
.boards { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; padding: 2px; border-radius: 8px; background: var(--slate-a3); }
.boards button { height: 26px; padding: 0 6px; border: 0; border-radius: 6px; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; white-space: nowrap; }
.boards button[aria-selected='true'] { background: var(--slate-a6); color: var(--fg); }
.mono { font-family: var(--font-mono); }
.title { margin: 16px 0 0; font-size: 18px; font-weight: 600; color: var(--fg); }
.lede { margin: 6px 0 0; color: var(--fg-2); font-size: var(--text-base); line-height: 1.55; }
.lede .mono { color: var(--fg-muted); }
.h { display: flex; align-items: baseline; gap: 6px; margin: 20px 0 6px; font-size: var(--text-sm); font-weight: 500; color: var(--fg-faint); }
.g-head { display: flex; align-items: center; gap: 6px; width: 100%; padding: 6px 4px; border: 0; background: none; color: var(--fg-2); font: inherit; font-size: var(--text-nav); text-align: left; cursor: pointer; border-radius: 6px; }
.g-head:hover { background: var(--slate-a2); color: var(--fg); }
.g-head svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; transition: transform 150ms; }
.g-head svg.open { transform: rotate(90deg); }
.n { margin-left: auto; font-size: var(--text-sm); color: var(--fg-faint); font-weight: 400; }
.parts { margin: 2px 0 6px; padding: 0; list-style: none; }
.part { display: flex; align-items: baseline; gap: 8px; width: 100%; padding: 4px 6px 4px 22px; border: 0; background: none; border-radius: 6px; color: var(--fg-2); font: inherit; font-size: var(--text-base); text-align: left; cursor: pointer; }
.part:hover { background: var(--slate-a2); color: var(--fg); }
.part .mono { flex: none; min-width: 38px; font-size: var(--text-sm); color: var(--fg-muted); }
.pn { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { flex: none; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; background: var(--amber-a3); color: var(--amber-11); font-size: 11px; line-height: 16px; text-align: center; }
.src { margin: 18px 0 0; font-size: var(--text-sm); color: var(--fg-faint); line-height: 1.6; }
.src a { color: var(--fg-muted); }
.back { margin-top: 14px; padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.back:hover { color: var(--fg); }
.c-ref { margin-top: 12px; font-size: var(--text-sm); color: var(--fg-muted); }
.c-name { margin: 2px 0 0; font-size: 17px; font-weight: 600; line-height: 1.35; color: var(--fg); word-break: break-word; }
.facts { display: grid; grid-template-columns: max-content 1fr; gap: 5px 14px; margin: 12px 0 0; font-size: var(--text-base); }
.facts dt { color: var(--fg-muted); }
.facts dd { margin: 0; color: var(--fg-2); word-break: break-word; }
.facts a { color: var(--indigo-11); text-decoration: none; }
.propose { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; height: 30px; padding: 0 12px; border: 0; border-radius: 8px; background: var(--indigo-9); color: #fff; font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer; }
.propose:hover { background: var(--indigo-10); }
.propose svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.list { border: 1px solid var(--slate-a4); border-radius: 10px; overflow: hidden; }
.none { margin: 0; color: var(--fg-faint); font-size: var(--text-base); }
@media (max-width: 899px) {
  .pp { grid-template-columns: minmax(0, 1fr); grid-template-rows: 52vh auto; height: auto; }
  .stage { order: -1; height: 52vh; }
  .side { border-right: 0; border-top: 1px solid var(--slate-a3); }
}
.nt { margin-top: 14px; }
.propose b { font-weight: 600; }
</style>
