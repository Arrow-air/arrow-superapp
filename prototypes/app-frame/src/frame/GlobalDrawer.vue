<script setup lang="ts">
import { useRouter } from 'vue-router';
import Drawer from './Drawer.vue';
import { footerLinks, linkGroups } from './links';
import { projects } from './nav';
import { useWorkspace } from './useWorkspace';

// The "secret passage" behind the logo: everything Arrow-wide. Mirrors the
// wallet drawer (right = you, left = Arrow).
const open = defineModel<boolean>('open', { required: true });
const router = useRouter();
const { project } = useWorkspace();

function goTo(id: string) {
  open.value = false;
  router.push(`/${id}/overview`);
}
</script>

<template>
  <Drawer v-model:open="open" side="left" title="Arrow" description="Everything across the DAO, in one place.">
    <section class="block">
      <h3 class="label caps">Hardware</h3>
      <div class="craft">
        <button
          v-for="p in projects"
          :key="p.id"
          type="button"
          class="craft-card"
          :aria-current="p.id === project?.id ? 'true' : undefined"
          @click="goTo(p.id)"
        >
          <span class="craft-thumb" aria-hidden="true">
            <img v-if="p.thumb" :src="p.thumb" alt="" />
            <span v-else class="craft-sketch"></span>
          </span>
          <span class="craft-name">{{ p.label }}</span>
          <span class="craft-ver">{{ p.versions[0].code }}</span>
        </button>
      </div>
    </section>

    <section v-for="g in linkGroups" :key="g.id" class="block">
      <h3 class="label caps">{{ g.label }}</h3>
      <ul class="links">
        <li v-for="l in g.links" :key="l.href">
          <a :href="l.href" target="_blank" rel="noopener">
            <span class="link-label">{{ l.label }}</span>
            <span v-if="l.desc" class="link-desc">{{ l.desc }}</span>
            <svg class="ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
          </a>
        </li>
      </ul>
    </section>

    <template #footer>
      <nav class="foot-links" aria-label="Arrow links">
        <a v-for="l in footerLinks" :key="l.href" :href="l.href" target="_blank" rel="noopener">{{ l.label }}</a>
      </nav>
    </template>
  </Drawer>
</template>

<style scoped>
.caps { font-size: var(--text-xs); letter-spacing: var(--tracking-caps); text-transform: uppercase; }
.label { margin: 0 0 var(--space-2); font-weight: 400; color: var(--fg-muted); }
.block + .block { margin-top: var(--space-6); }

.craft { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
.craft-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 6px 8px;
  border: 1px solid var(--toolbar-border);
  border-radius: 10px;
  background: var(--slate-a2);
  text-align: left;
  cursor: pointer;
  transition: border-color 150ms, background-color 150ms;
}
.craft-card:hover { border-color: var(--border-strong); background: var(--slate-a3); }
.craft-card[aria-current='true'] { border-color: var(--indigo-a7); background: var(--indigo-a2); }
.craft-thumb {
  display: grid;
  place-items: center;
  width: 100%;
  height: 48px;
  margin-bottom: 4px;
  border-radius: 6px;
  background: var(--thumb-bg);
}
.craft-thumb img { width: 88%; height: auto; filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.4)); }
.craft-sketch {
  width: 60%;
  height: 24px;
  background: center / contain no-repeat
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 20' fill='none' stroke='%23b0b4ba' stroke-width='1.2' stroke-linecap='round'%3E%3Cpath d='M3 11h36M8 11l14-8M10 11l14 6M30 11l4-5M30 11l4 5M16 7h10M16 15h10'/%3E%3C/svg%3E");
}
.craft-name { color: var(--fg); font-weight: 500; }
.craft-ver { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-faint); }

.links { margin: 0; padding: 0; list-style: none; }
.links a {
  display: grid;
  grid-template-columns: 1fr auto;
  column-gap: var(--space-2);
  padding: 6px var(--space-2);
  margin-inline: calc(-1 * var(--space-2));
  border-radius: 8px;
  color: var(--fg);
  text-decoration: none;
  transition: background-color 150ms;
}
.links a:hover { background: var(--surface-hover); }
.link-label { grid-column: 1; }
.link-desc { grid-column: 1; font-size: var(--text-sm); color: var(--fg-muted); }
.ext {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--fg-faint);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.links a:hover .ext { stroke: var(--fg-2); }
.links a:focus-visible, .craft-card:focus-visible, .foot-links a:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--focus-ring); }

.foot-links { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); }
.foot-links a { color: var(--fg-muted); font-size: var(--text-sm); text-decoration: none; }
.foot-links a:hover { color: var(--fg); }
</style>
