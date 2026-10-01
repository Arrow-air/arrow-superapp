<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThreadDetail from './ThreadDetail.vue';
import { canDelete, deleteThread, state } from './store';
import { zoneLabel, zonePath } from '../../frame/nav';

// The one place a thread opens. Any page links a thread with ?thread=Q-3;
// the panel slides over the right of the content and the page stays where it
// was. Close returns you to it; expand gives the thread the whole column.
const route = useRoute();
const router = useRouter();
const id = computed(() => route.query.thread as string | undefined);
const thread = computed(() => state.threads.find((t) => t.id === id.value));
const expanded = ref(false);

function close() {
  const { thread: _drop, ...rest } = route.query;
  router.replace({ query: rest });
}
const onKey = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  if (e.key === 'Escape' && thread.value && !el?.closest?.('input, textarea')) close();
};
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

const body = ref<HTMLElement>();
watch(id, () => body.value?.scrollTo(0, 0));
// Leaving a page closes the expanded view, so the next page is visible.
watch(() => route.path, () => (expanded.value = false));
const home = computed(() => (thread.value ? zonePath(thread.value.zone) : ''));

// Deleting: an inline confirmation with a reason, then the panel closes.
const confirming = ref(false);
const reason = ref('');
const isLead = computed(() => state.role === 'lead');
watch(id, () => { confirming.value = false; reason.value = ''; });
function remove() {
  if (!thread.value) return;
  deleteThread(thread.value, reason.value.trim());
  confirming.value = false;
  reason.value = '';
  close();
}
const atHome = computed(() => route.path === home.value);
</script>

<template>
  <Transition name="panel">
    <aside v-if="thread" class="panel" :class="{ expanded }" aria-label="Thread">
      <header class="bar">
        <span class="where">
          <RouterLink v-if="!atHome" :to="{ path: home, query: { thread: thread.id } }" class="home" title="Go to the zone this thread lives in">{{ zoneLabel(thread.zone) }}</RouterLink>
          <span v-else class="home here">{{ zoneLabel(thread.zone) }}</span>
          <span class="sep">›</span>
          <span class="mono">{{ thread.id }}</span>
        </span>
        <span class="acts">
          <button v-if="canDelete(thread)" class="ic" type="button" title="Delete thread" aria-label="Delete thread" :aria-pressed="confirming" @click="confirming = !confirming">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M7 7v4M9 7v4" /></svg>
          </button>
          <button class="ic" type="button" :aria-pressed="expanded" :title="expanded ? 'Back to side panel' : 'Expand'" @click="expanded = !expanded">
            <svg v-if="!expanded" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9" /></svg>
            <svg v-else viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 6.5h-4v-4M2.5 9.5h4v4M9.5 6.5 14 2M6.5 9.5 2 14" /></svg>
          </button>
          <button class="ic" type="button" title="Close (Esc)" aria-label="Close thread" @click="close">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
          </button>
        </span>
      </header>
      <form v-if="confirming" class="confirm" @submit.prevent="remove">
        <p>Delete {{ thread.id }}? It disappears for everyone{{ isLead ? '' : '. You can do this until someone else joins in' }}.</p>
        <div class="c-row">
          <input v-model="reason" :placeholder="isLead ? 'Why: spam, duplicate, off-topic' : 'Why (optional)'" aria-label="Reason for deleting" autofocus />
          <button class="danger" type="submit">Delete thread</button>
          <button class="cancel" type="button" @click="confirming = false">Cancel</button>
        </div>
      </form>
      <div ref="body" class="scroll">
        <ThreadDetail :thread="thread" />
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.panel {
  position: absolute; z-index: 20; top: 0; right: 0; bottom: 0;
  width: min(580px, 100%);
  display: flex; flex-direction: column;
  background: var(--thread-bg);
  border-left: 1px solid var(--slate-a4);
  box-shadow: -18px 0 40px -18px rgb(0 0 0 / 0.45);
}
.panel.expanded { width: 100%; border-left: 0; }
.panel.expanded :deep(.detail) { margin: 0 auto; }
.bar {
  flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  height: 44px; padding: 0 10px 0 20px; border-bottom: 1px solid var(--slate-a3);
}
.where { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: var(--text-sm); color: var(--fg-muted); }
.home { color: var(--fg-2); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
a.home:hover { color: var(--fg); text-decoration: underline; }
.home.here { color: var(--fg-muted); }
.sep { color: var(--fg-faint); }
.mono { font-family: var(--font-mono); }
.acts { display: inline-flex; gap: 2px; }
.ic {
  display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 7px;
  background: none; color: var(--fg-muted); cursor: pointer;
}
.ic:hover { background: var(--slate-a3); color: var(--fg); }
.ic svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.confirm { flex: none; padding: 10px 20px 12px; border-bottom: 1px solid var(--red-a5, var(--slate-a4)); background: var(--red-a2, var(--slate-a2)); }
.confirm p { margin: 0 0 8px; font-size: var(--text-base); color: var(--fg-2); }
.c-row { display: flex; gap: 6px; }
.c-row input { flex: 1; min-width: 0; height: 30px; padding: 0 10px; border: 1px solid var(--slate-a5); border-radius: 8px; background: var(--surface); color: var(--fg); font: inherit; font-size: var(--text-base); outline: none; }
.danger { height: 30px; padding: 0 12px; border: 0; border-radius: 8px; background: var(--red-9); color: #fff; font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer; }
.cancel { height: 30px; padding: 0 10px; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.scroll { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; }

.panel-enter-active, .panel-leave-active { transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1), opacity 160ms; }
.panel-enter-from, .panel-leave-to { transform: translateX(24px); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .panel-enter-active, .panel-leave-active { transition: none; } }
@media (max-width: 767px) {
  .panel { position: fixed; inset: 0; width: 100%; z-index: 60; border-left: 0; }
}
</style>
