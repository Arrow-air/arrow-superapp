<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

// Segmented tabs with a sliding indicator, after coss ui Tabs (size lg),
// with a recessed track and a raised pill for depth.
// Items are router links, so each tab is a real, shareable URL.
// An item with `divider` starts a new group: places first, then the views across them.
const props = defineProps<{ items: { id: string; label: string; to: string; divider?: boolean }[]; active?: string; label: string }>();

const list = ref<HTMLElement>();
const indicator = ref({ left: 0, width: 0, visible: false });
// No slide on first paint; the indicator should appear in place, then animate.
const animate = ref(false);

function measure() {
  const el = list.value?.querySelector<HTMLElement>('[aria-current="page"]');
  indicator.value = el
    ? { left: el.offsetLeft, width: el.offsetWidth, visible: true }
    : { ...indicator.value, visible: false };
  el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

let ro: ResizeObserver | undefined;
onMounted(async () => {
  await nextTick();
  measure();
  requestAnimationFrame(() => (animate.value = true));
  ro = new ResizeObserver(measure);
  ro.observe(list.value!);
});
onBeforeUnmount(() => ro?.disconnect());
watch(() => props.active, () => nextTick(measure));
</script>

<template>
  <nav ref="list" class="tabs" :class="{ animate }" :aria-label="label">
    <template v-for="t in items" :key="t.id">
      <span v-if="t.divider" class="divider" aria-hidden="true"></span>
      <RouterLink
        :to="t.to"
        class="tab"
        :aria-current="t.id === active ? 'page' : undefined"
      >
        {{ t.label }}
      </RouterLink>
    </template>
    <span
      v-show="indicator.visible"
      class="indicator"
      aria-hidden="true"
      :style="{ width: `${indicator.width}px`, translate: `${indicator.left}px 0` }"
    ></span>
  </nav>
</template>

<style scoped>
.divider { flex: none; align-self: center; width: 1px; height: 16px; margin: 0 6px; background: var(--slate-a6); }
.tabs {
  position: relative;
  z-index: 0;
  display: flex;
  gap: 2px;
  width: fit-content;
  max-width: 100%;
  padding: 3px;
  border-radius: 11px;
  background: var(--tabs-track);
  box-shadow: var(--tabs-track-shadow);
  overflow-x: auto;
  scrollbar-width: none;
}
.tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 0 auto;
  height: 30px;
  padding-inline: 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--tabs-fg);
  font-size: var(--text-base);
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  outline: none;
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.tab:hover { color: var(--tabs-fg-hover); }
.tab[aria-current='page'] {
  color: var(--tabs-fg-active);
  text-shadow: 0 1px 1px rgb(0 0 0 / 0.4);
}
.tab:focus-visible { box-shadow: 0 0 0 2px var(--focus-ring); }

.indicator {
  position: absolute;
  z-index: -1;
  top: 3px;
  bottom: 3px;
  left: 0;
  border-radius: 8px;
  background: var(--tabs-indicator);
  box-shadow: var(--tabs-indicator-shadow);
}
.animate .indicator {
  transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1), translate 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
@media (prefers-reduced-motion: reduce) {
  .animate .indicator { transition: none; }
}
</style>
