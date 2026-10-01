<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { arrowPanelOpen as open } from './layout';
import { footerLinks, linkGroups } from './links';
import { defaultVersion, projects } from './nav';
import { useWorkspace } from './useWorkspace';

// The Arrow panel behind the logo capsule: everything Arrow-wide. It sits in
// the page layout and pushes the app right rather than covering it; on
// phones there's no room to push, so it overlays instead.
const router = useRouter();
const { project } = useWorkspace();

function goTo(id: string) {
  router.push(`/${id}/overview`);
}

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && open.value) open.value = false; };
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <aside class="arrow-panel" :class="{ open }" aria-label="Arrow" :inert="!open || undefined">
    <div class="panel-inner">
      <header class="brand-head">
        <span class="brand-name">Arrow</span>
        <span class="brand-sub">Everything across the DAO</span>
      </header>

      <div class="panel-body">
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

      </div>

      <footer class="panel-foot">
        <nav class="foot-links" aria-label="Arrow links">
          <a v-for="l in footerLinks" :key="l.href" :href="l.href" target="_blank" rel="noopener">{{ l.label }}</a>
        </nav>
      </footer>
    </div>
  </aside>
  <div class="scrim" :class="{ open }" aria-hidden="true" @click="open = false"></div>
</template>

<style scoped>
/* The panel animates its width, so the app beside it reflows (a push).
   The inner column keeps a fixed width so content doesn't squash mid-slide. */
.arrow-panel {
  flex: none;
  width: 0;
  height: 100dvh;
  overflow: hidden;
  background: var(--brand-panel);
  color: var(--on-brand);
  transition: width 400ms cubic-bezier(0.32, 0.72, 0, 1);
}
.arrow-panel.open { width: var(--arrow-panel-width); }
.panel-inner {
  width: var(--arrow-panel-width);
  height: 100%;
  display: flex;
  flex-direction: column;
}
.brand-head {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: var(--bar-height);
  flex: none;
  padding: 0 var(--space-4);
  line-height: 1.25;
}
.brand-name { font-size: var(--text-md); font-weight: 600; color: var(--on-brand); }
.brand-sub { font-size: var(--text-sm); color: var(--on-brand-3); }
.panel-body { flex: 1; min-height: 0; overflow-y: auto; padding: var(--space-2) var(--space-4) var(--space-4); scrollbar-width: none; }
.panel-foot { flex: none; padding: var(--space-3) var(--space-4); border-top: 1px solid var(--on-brand-line); }
.scrim { display: none; }

@media (prefers-reduced-motion: reduce) { .arrow-panel { transition-duration: 1ms; } }

/* Phones: no room to push, so the panel overlays with a scrim. */
@media (max-width: 767px) {
  .arrow-panel { position: fixed; inset: 0 auto 0 0; z-index: 50; box-shadow: 24px 0 48px rgb(0 0 0 / 0.35); }
  .arrow-panel.open { width: min(var(--arrow-panel-width), 85vw); }
  .scrim { position: fixed; inset: 0; z-index: 49; background: var(--overlay); opacity: 0; pointer-events: none; transition: opacity 300ms; }
  .scrim.open { display: block; opacity: 1; pointer-events: auto; }
}

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
