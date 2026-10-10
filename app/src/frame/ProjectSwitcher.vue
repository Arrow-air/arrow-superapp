<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Menu from './Menu.vue';
import { defaultVersion, findTab, findItem, homePath, projects, statusLabel, statusNote, type VersionStatus } from './nav';
import { useWorkspace } from './useWorkspace';
import { useFreeze } from './freeze';
const freeze = useFreeze();

// Which project (an aircraft, a battery pack), and which version of it. Lives
// in the workspace header because the tabs and sidebar below it belong to the
// chosen project.
const router = useRouter();
const { project, tab, item } = useWorkspace();

// Version is frame state for now; nothing downstream reads it yet.
const versionId = ref<string>();
const version = computed(() =>
  project.value ? project.value.versions.find((v) => v.id === versionId.value) ?? defaultVersion(project.value) : undefined,
);
const dot = (s: VersionStatus) => `var(--status-${s})`;

// Stay on the same page when the other project has it (Decisions, All
// threads); otherwise open the project where it starts.
function switchProject(id: string) {
  versionId.value = undefined;
  const p = projects.find((x) => x.id === id);
  if (!p) return;
  const sameTab = findTab(tab.value?.id, p.id);
  const sameItem = sameTab && findItem(sameTab, item.value?.id);
  router.push(sameTab && sameItem && tab.value?.view ? `/${p.id}/${sameTab.id}/${sameItem.id}` : homePath(p));
}
</script>

<template>
  <div class="toolbar" role="toolbar" aria-label="Project">
    <Menu :items="projects.map((p) => ({ id: p.id, label: p.label, note: p.kind }))" :current="project?.id" @select="switchProject">
      <template #trigger="{ open, toggle }">
        <button class="tbtn with-thumb" type="button" aria-haspopup="menu" :aria-expanded="open" aria-label="Project" @click="toggle">
          <span class="thumb" aria-hidden="true">
            <img v-if="project?.thumb" :src="project.thumb" alt="" width="48" height="21" />
            <span v-else-if="project?.id === 'longshot'" class="sketch pack"></span>
            <span v-else class="sketch"></span>
          </span>
          <span class="name">{{ project?.label ?? 'Select project' }}</span>
          <svg class="chev-v" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
        </button>
      </template>
    </Menu>

    <template v-if="project && version">
      <span class="tsep" aria-hidden="true"></span>
      <Menu
        :items="project.versions.map((v) => ({ id: v.id, label: statusLabel[v.status], note: v.status === 'upcoming' && freeze.active.value ? (freeze.frozen.value ? 'Design frozen' : `Design freeze in ${freeze.label.value}`) : statusNote[v.status], hint: v.code, dot: dot(v.status) }))"
        :current="version.id"
        @select="versionId = $event"
      >
        <template #trigger="{ open, toggle }">
          <button
            class="tbtn"
            type="button"
            aria-haspopup="menu"
            :aria-expanded="open"
            :aria-label="`Version ${version.code}, ${statusLabel[version.status]}`"
            :title="statusNote[version.status]"
            @click="toggle"
          >
            <span class="status-dot" :data-status="version.status" aria-hidden="true"></span>
            <span class="version-label">{{ statusLabel[version.status] }} version</span>
            <span class="code">{{ version.code }}</span>
            <svg class="chev-v" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
          </button>
        </template>
      </Menu>
    </template>
  </div>
</template>

<style scoped>
.toolbar { flex: none; }
.name { color: var(--fg); }
/* Thumbnail sits 7px from the toolbar edge on the left, top and bottom. */
.with-thumb { padding-left: 2px; gap: 8px; }
/* The aircraft render is dark on transparent, so it sits on a small lit tile. */
.thumb {
  display: grid;
  place-items: center;
  width: 52px;
  height: 22px;
  border-radius: 6px;
  background: var(--thumb-bg);
  box-shadow: inset 0 1px 0 var(--slate-a4), inset 0 0 0 1px var(--slate-a3);
  overflow: hidden;
}
.thumb img { display: block; width: 48px; height: auto; filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.4)); }
.sketch {
  width: 36px;
  height: 16px;
  background: center / contain no-repeat
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 20' fill='none' stroke='%23b0b4ba' stroke-width='1.2' stroke-linecap='round'%3E%3Cpath d='M3 11h36M8 11l14-8M10 11l14 6M30 11l4-5M30 11l4 5M16 7h10M16 15h10'/%3E%3C/svg%3E");
}
/* A battery pack: a box of cells with its connector. */
.sketch.pack {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 20' fill='none' stroke='%23b0b4ba' stroke-width='1.2' stroke-linecap='round'%3E%3Crect x='6' y='4' width='30' height='13' rx='1.5'/%3E%3Cpath d='M36 8.5h3v4h-3M11 7.5v6M16 7.5v6M21 7.5v6M26 7.5v6M31 7.5v6'/%3E%3C/svg%3E");
}
/* The chevron's glyph sits inside a 12px box with blank space either side;
   pull the box in so the gap after it matches the gap before the lit dot. */
.tbtn .chev-v:last-child { margin-right: -4px; }

/* Version status: a lit dot, coloured by how current the version is. */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dot);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--dot) 22%, transparent), 0 0 8px color-mix(in srgb, var(--dot) 60%, transparent);
}
.status-dot[data-status='upcoming'] { --dot: var(--status-upcoming); }
.status-dot[data-status='current'] { --dot: var(--status-current); }
.status-dot[data-status='previous'] { --dot: var(--status-previous); }
.status-dot[data-status='unmaintained'] { --dot: var(--status-unmaintained); }
.code { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-faint); }
@media (max-width: 767px) {
  .version-label { display: none; }
}
</style>
