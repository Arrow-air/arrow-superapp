<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Menu from './Menu.vue';
import { projects } from './nav';
import { useWorkspace } from './useWorkspace';

// Which aircraft, and which version of it. Lives in the workspace header
// because the tabs and sidebar below it belong to the chosen aircraft.
const router = useRouter();
const { project, tab, item } = useWorkspace();

// Version is frame state for now; nothing downstream reads it yet.
const versionId = ref<string>();
const version = computed(
  () => project.value?.versions.find((v) => v.id === versionId.value) ?? project.value?.versions[0],
);

function switchProject(id: string) {
  versionId.value = undefined;
  router.push(`/${id}/${tab.value?.id ?? 'overview'}/${item.value?.id ?? ''}`);
}
</script>

<template>
  <div class="toolbar" role="toolbar" aria-label="Aircraft">
    <Menu :items="projects.map((p) => ({ id: p.id, label: p.label }))" :current="project?.id" @select="switchProject">
      <template #trigger="{ open, toggle }">
        <button class="tbtn" type="button" aria-haspopup="menu" :aria-expanded="open" aria-label="Aircraft" @click="toggle">
          <span class="thumb" aria-hidden="true"></span>
          <span class="name">{{ project?.label ?? 'Select aircraft' }}</span>
          <svg class="chev-v" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
        </button>
      </template>
    </Menu>

    <template v-if="project && version">
      <span class="tsep" aria-hidden="true"></span>
      <Menu
        :items="project.versions.map((v) => ({ id: v.id, label: v.label, hint: v.code }))"
        :current="version.id"
        @select="versionId = $event"
      >
        <template #trigger="{ open, toggle }">
          <button class="tbtn" type="button" aria-haspopup="menu" :aria-expanded="open" aria-label="Version" @click="toggle">
            <span class="version-label">{{ version.label }}</span>
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
.thumb {
  width: 36px;
  height: 16px;
  background: center / contain no-repeat
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 20' fill='none' stroke='%23b0b4ba' stroke-width='1.2' stroke-linecap='round'%3E%3Cpath d='M3 11h36M8 11l14-8M10 11l14 6M30 11l4-5M30 11l4 5M16 7h10M16 15h10'/%3E%3C/svg%3E");
}
.code { font-family: var(--font-mono); font-size: var(--text-sm); color: var(--fg-faint); }
@media (max-width: 767px) {
  .version-label { display: none; }
}
</style>
