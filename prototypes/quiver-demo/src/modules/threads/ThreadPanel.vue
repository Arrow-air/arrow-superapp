<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ThreadDetail from './ThreadDetail.vue';
import { state } from './store';
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
          <button class="ic" type="button" :aria-pressed="expanded" :title="expanded ? 'Back to side panel' : 'Expand'" @click="expanded = !expanded">
            <svg v-if="!expanded" viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9" /></svg>
            <svg v-else viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 6.5h-4v-4M2.5 9.5h4v4M9.5 6.5 14 2M6.5 9.5 2 14" /></svg>
          </button>
          <button class="ic" type="button" title="Close (Esc)" aria-label="Close thread" @click="close">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
          </button>
        </span>
      </header>
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
.scroll { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; }

.panel-enter-active, .panel-leave-active { transition: transform 200ms cubic-bezier(0.32, 0.72, 0, 1), opacity 160ms; }
.panel-enter-from, .panel-leave-to { transform: translateX(24px); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .panel-enter-active, .panel-leave-active { transition: none; } }
@media (max-width: 767px) {
  .panel { position: fixed; inset: 0; width: 100%; z-index: 60; border-left: 0; }
}
</style>
