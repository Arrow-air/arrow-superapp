<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

// Side drawer after shadcn/ui Drawer (direction right): a dimmed overlay and
// a full-height panel, 3/4 of the screen up to 384px. Closes on Escape or an
// overlay click, traps Tab inside, and hands focus back to the opener.
const open = defineModel<boolean>('open', { required: true });
defineProps<{ title: string; description?: string }>();

const panel = ref<HTMLElement>();
let opener: HTMLElement | null = null;

const focusables = () =>
  [...(panel.value?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false;
  if (e.key !== 'Tab') return;
  const f = focusables();
  if (!f.length) return;
  const [first, last] = [f[0], f[f.length - 1]];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    opener = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    await nextTick();
    panel.value?.focus();
  } else {
    document.removeEventListener('keydown', onKey);
    document.documentElement.style.overflow = '';
    opener?.focus();
  }
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.documentElement.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer" :duration="500">
      <div v-if="open" class="drawer-root">
        <div class="overlay" aria-hidden="true" @click="open = false"></div>
        <section
          ref="panel"
          class="panel"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <header class="head">
            <div class="head-text">
              <h2 class="title">{{ title }}</h2>
              <p v-if="description" class="desc">{{ description }}</p>
            </div>
            <button class="close" type="button" aria-label="Close" @click="open = false">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </header>
          <div class="body"><slot /></div>
          <footer v-if="$slots.footer" class="foot"><slot name="footer" /></footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-root { position: fixed; inset: 0; z-index: 50; }
.overlay { position: absolute; inset: 0; background: var(--overlay); }
.panel {
  position: absolute;
  inset: 0 0 0 auto;
  width: 75%;
  max-width: 384px;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: -24px 0 48px rgb(0 0 0 / 0.35);
  outline: none;
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
}
.title { margin: 0; font-size: var(--text-md); font-weight: 600; color: var(--fg); }
.desc { margin: 2px 0 0; font-size: var(--text-base); color: var(--fg-muted); }
.close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  margin: -4px -4px 0 0;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--fg-muted);
  cursor: pointer;
}
.close:hover { background: var(--surface-hover); color: var(--fg); }
.close svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
.body { flex: 1; min-height: 0; overflow-y: auto; padding: 0 var(--space-4) var(--space-4); }
.foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--border-soft);
}

/* vaul's easing: quick out, long settle */
.drawer-enter-active .overlay, .drawer-leave-active .overlay { transition: opacity 500ms cubic-bezier(0.32, 0.72, 0, 1); }
.drawer-enter-active .panel, .drawer-leave-active .panel { transition: transform 500ms cubic-bezier(0.32, 0.72, 0, 1); }
.drawer-enter-from .panel, .drawer-leave-to .panel { transform: translateX(100%); }
.drawer-enter-from .overlay, .drawer-leave-to .overlay { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active .overlay, .drawer-leave-active .overlay,
  .drawer-enter-active .panel, .drawer-leave-active .panel { transition-duration: 1ms; }
}
</style>
