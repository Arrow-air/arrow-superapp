<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import Icon from './Icon.vue';
import Kbd from './Kbd.vue';
import type { IconName } from './icons';
import { linkGroups } from './links';
import { projects, tabs } from './nav';
import { useWorkspace } from './useWorkspace';

// ⌘K: jump to any page of the current aircraft, switch aircraft, or open an
// Arrow-wide link. Results are local; real search plugs in later.
const open = defineModel<boolean>('open', { required: true });
const router = useRouter();
const { project, base } = useWorkspace();

interface Result { id: string; label: string; hint?: string; icon: IconName; run: () => void }
interface Section { id: string; label: string; results: Result[] }

const query = ref('');
const active = ref(0);
const input = ref<HTMLInputElement>();
const list = ref<HTMLElement>();

const all = computed<Section[]>(() => [
  {
    id: 'pages',
    label: project.value ? `${project.value.label} pages` : 'Pages',
    results: tabs.flatMap((t) =>
      t.groups.flatMap((g) =>
        g.items.map((i) => ({
          id: `page:${t.id}/${i.id}`,
          label: i.label,
          hint: `${t.label} · ${g.label}`,
          icon: i.icon,
          run: () => router.push(`${base.value}/${t.id}/${i.id}`),
        })),
      ),
    ),
  },
  {
    id: 'aircraft',
    label: 'Aircraft',
    results: projects.map((p) => ({
      id: `aircraft:${p.id}`,
      label: p.label,
      hint: p.versions[0].code,
      icon: 'plane' as IconName,
      run: () => router.push(`/${p.id}/overview`),
    })),
  },
  {
    id: 'links',
    label: 'Arrow',
    results: linkGroups.flatMap((g) =>
      g.links.map((l) => ({
        id: `link:${l.href}`,
        label: l.label,
        hint: g.label,
        icon: 'share' as IconName,
        run: () => window.open(l.href, '_blank', 'noopener'),
      })),
    ),
  },
]);

const sections = computed(() => {
  const q = query.value.trim().toLowerCase();
  return all.value
    .map((s) => ({
      ...s,
      results: s.results
        .filter((r) => !q || `${r.label} ${r.hint ?? ''}`.toLowerCase().includes(q))
        .slice(0, q ? 8 : 5),
    }))
    .filter((s) => s.results.length);
});
const flat = computed(() => sections.value.flatMap((s) => s.results));

watch(query, () => (active.value = 0));
watch(open, async (isOpen) => {
  if (!isOpen) return;
  query.value = '';
  active.value = 0;
  await nextTick();
  input.value?.focus();
});

function run(r?: Result) {
  if (!r) return;
  open.value = false;
  r.run();
}
function move(delta: number) {
  const n = flat.value.length;
  if (!n) return;
  active.value = (active.value + delta + n) % n;
  nextTick(() => list.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
  else if (e.key === 'Enter') { e.preventDefault(); run(flat.value[active.value]); }
  else if (e.key === 'Escape') { open.value = false; }
}
const indexOf = (r: Result) => flat.value.indexOf(r);
</script>

<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="open" class="palette-root">
        <div class="overlay" aria-hidden="true" @click="open = false"></div>
        <div class="palette" role="dialog" aria-modal="true" aria-label="Search Arrow">
          <div class="field">
            <svg class="search" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input
              ref="input"
              v-model="query"
              type="text"
              placeholder="Search pages, aircraft and links…"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              :aria-activedescendant="flat[active] ? `pal-${active}` : undefined"
              @keydown="onKey"
            />
            <Kbd :keys="['Esc']" />
          </div>

          <div id="palette-list" ref="list" class="results" role="listbox">
            <p v-if="!flat.length" class="empty">Nothing matches “{{ query }}”.</p>
            <section v-for="s in sections" :key="s.id" class="section">
              <h3 class="section-label">{{ s.label }}</h3>
              <div
                v-for="r in s.results"
                :id="`pal-${indexOf(r)}`"
                :key="r.id"
                class="result"
                role="option"
                :aria-selected="indexOf(r) === active"
                @mousemove="active = indexOf(r)"
                @click="run(r)"
              >
                <Icon :name="r.icon" :size="14" class="r-icon" />
                <span class="r-label">{{ r.label }}</span>
                <span v-if="r.hint" class="r-hint">{{ r.hint }}</span>
              </div>
            </section>
          </div>

          <footer class="foot">
            <span><Kbd :keys="['↑', '↓']" /> to move</span>
            <span><Kbd :keys="['↵']" /> to open</span>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.palette-root { position: fixed; inset: 0; z-index: 60; }
.overlay { position: absolute; inset: 0; background: var(--overlay); }
.palette {
  position: absolute;
  top: 12vh;
  left: 50%;
  width: min(560px, calc(100vw - 32px));
  max-height: min(480px, 76vh);
  display: flex;
  flex-direction: column;
  transform: translateX(-50%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 24px 64px rgb(0 0 0 / 0.5), inset 0 1px 0 var(--slate-a3);
  overflow: hidden;
}
.field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  height: 48px;
  border-bottom: 1px solid var(--border-soft);
}
.search { width: 16px; height: 16px; fill: none; stroke: var(--fg-muted); stroke-width: 2; stroke-linecap: round; flex: none; }
.field input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: none;
  color: var(--fg);
  font: inherit;
  font-size: var(--text-md);
  outline: none;
}
.field input::placeholder { color: var(--fg-faint); }

.results { flex: 1; overflow-y: auto; padding: var(--space-2); }
.section + .section { margin-top: var(--space-2); }
.section-label {
  margin: 0;
  padding: 6px var(--space-2) 4px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--fg-muted);
}
.result {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 34px;
  padding: 0 var(--space-2);
  border-radius: 8px;
  color: var(--fg-2);
  cursor: pointer;
}
.result[aria-selected='true'] { background: var(--indigo-a3); color: var(--fg); }
.r-icon { color: var(--fg-muted); flex: none; }
.result[aria-selected='true'] .r-icon { color: var(--indigo-11); }
.r-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-hint { font-size: var(--text-sm); color: var(--fg-faint); white-space: nowrap; }
.empty { margin: 0; padding: var(--space-6) var(--space-2); text-align: center; color: var(--fg-muted); }

.foot {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--border-soft);
  font-size: var(--text-sm);
  color: var(--fg-muted);
}
.foot span { display: inline-flex; align-items: center; gap: 6px; }

.palette-enter-active, .palette-leave-active { transition: opacity 160ms ease; }
.palette-enter-active .palette, .palette-leave-active .palette { transition: transform 160ms ease, opacity 160ms ease; }
.palette-enter-from, .palette-leave-to { opacity: 0; }
.palette-enter-from .palette, .palette-leave-to .palette { transform: translateX(-50%) scale(0.97); }
@media (prefers-reduced-motion: reduce) {
  .palette-enter-active, .palette-leave-active,
  .palette-enter-active .palette, .palette-leave-active .palette { transition-duration: 1ms; }
}
</style>
