<script setup lang="ts">
import { useRouter } from 'vue-router';
import Drawer from './Drawer.vue';
import LogoCapsule from './LogoCapsule.vue';
import { footerLinks, linkGroups } from './links';
import { defaultVersion, projects } from './nav';
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
  <Drawer v-model:open="open" side="left" tone="brand" title="Arrow">
    <template #head="{ close }">
      <header class="brand-head">
        <LogoCapsule :open="true" on-brand @toggle="close" />
        <div class="brand-title">
          <span class="brand-name">Arrow</span>
          <span class="brand-sub">Everything across the DAO</span>
        </div>
      </header>
    </template>

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
          <span class="craft-ver">{{ defaultVersion(p).code }}</span>
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
/* Head sits exactly where the app bar's capsule is, so the capsule stays put. */
.brand-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: var(--bar-height);
  padding: 0 var(--frame-inset);
  margin-bottom: var(--space-2);
}
.brand-title { display: flex; flex-direction: column; line-height: 1.25; }
.brand-name { font-size: var(--text-md); font-weight: 600; color: var(--on-brand); }
.brand-sub { font-size: var(--text-sm); color: var(--on-brand-3); }

.caps { font-size: var(--text-xs); letter-spacing: var(--tracking-caps); text-transform: uppercase; }
.label { margin: 0 0 var(--space-2); font-weight: 500; color: var(--on-brand-3); }
.block + .block { margin-top: var(--space-6); }

.craft { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
.craft-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 6px 8px;
  border: 1px solid var(--on-brand-line);
  border-radius: 10px;
  background: var(--on-brand-fill);
  color: var(--on-brand);
  text-align: left;
  cursor: pointer;
  transition: border-color 150ms, background-color 150ms;
}
.craft-card:hover { background: var(--on-brand-hover); border-color: rgb(255 255 255 / 0.3); }
.craft-card[aria-current='true'] { border-color: rgb(255 255 255 / 0.7); background: rgb(255 255 255 / 0.16); }
.craft-thumb {
  display: grid;
  place-items: center;
  width: 100%;
  height: 48px;
  margin-bottom: 4px;
  border-radius: 6px;
  background: radial-gradient(ellipse at 50% 40%, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.12) 70%);
}
.craft-thumb img { width: 88%; height: auto; filter: drop-shadow(0 2px 2px rgb(0 0 0 / 0.35)); }
.craft-sketch {
  width: 60%;
  height: 24px;
  background: center / contain no-repeat
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 20' fill='none' stroke='%23ffffff' stroke-width='1.2' stroke-linecap='round'%3E%3Cpath d='M3 11h36M8 11l14-8M10 11l14 6M30 11l4-5M30 11l4 5M16 7h10M16 15h10'/%3E%3C/svg%3E");
}
.craft-name { font-weight: 500; }
.craft-ver { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--on-brand-3); }

.links { margin: 0; padding: 0; list-style: none; }
.links a {
  display: grid;
  grid-template-columns: 1fr auto;
  column-gap: var(--space-2);
  padding: 6px var(--space-2);
  margin-inline: calc(-1 * var(--space-2));
  border-radius: 8px;
  color: var(--on-brand);
  text-decoration: none;
  transition: background-color 150ms;
}
.links a:hover { background: var(--on-brand-hover); }
.link-label { grid-column: 1; font-weight: 500; }
.link-desc { grid-column: 1; font-size: var(--text-sm); color: var(--on-brand-3); }
.ext {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--on-brand-3);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.links a:hover .ext { stroke: var(--on-brand); }
.links a:focus-visible, .craft-card:focus-visible, .foot-links a:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--on-brand); }

.foot-links { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); }
.foot-links a { color: var(--on-brand-2); font-size: var(--text-sm); text-decoration: none; }
.foot-links a:hover { color: var(--on-brand); }
</style>
