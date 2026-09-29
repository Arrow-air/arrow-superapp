<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import Icon from './Icon.vue';
import Picker from './Picker.vue';
import AccountBar from './AccountBar.vue';
import { projects } from './nav';
import { useWorkspace } from './useWorkspace';

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
  <header class="bar">
    <RouterLink to="/" class="logo" aria-label="Arrow home"><Icon name="arrow" :size="20" /></RouterLink>

    <Picker
      label="Project"
      :options="projects.map((p) => ({ id: p.id, label: p.label }))"
      :current="project?.id"
      @select="switchProject"
    >
      <span class="thumb" aria-hidden="true"></span>
      <span>{{ project?.label ?? 'Select project' }}</span>
    </Picker>

    <Picker
      v-if="project && version"
      class="version"
      label="Version"
      :options="project.versions.map((v) => ({ id: v.id, label: v.label, hint: v.code }))"
      :current="version.id"
      @select="versionId = $event"
    >
      <span class="version-label">{{ version.label }}</span>
      <span class="code">{{ version.code }}</span>
    </Picker>

    <span class="spacer"></span>

    <AccountBar />
  </header>
</template>

<style scoped>
.bar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: var(--bar-height);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding-inline: var(--frame-inset);
  background: var(--bg);
}
.logo {
  display: grid;
  place-items: center;
  width: var(--control-height);
  height: var(--control-height);
  border-radius: var(--radius-sm);
  background: var(--brand);
  color: var(--brand-fg);
}
.thumb {
  width: 44px;
  height: 20px;
  background: center / contain no-repeat
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 20' fill='none' stroke='%23b8b8b8' stroke-width='1.2' stroke-linecap='round'%3E%3Cpath d='M3 11h36M8 11l14-8M10 11l14 6M30 11l4-5M30 11l4 5M16 7h10M16 15h10'/%3E%3C/svg%3E");
}
.code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--fg-faint);
}
.spacer { flex: 1; }

@media (max-width: 767px) {
  .bar { padding-inline: var(--gutter); }
  .version-label, .thumb { display: none; }
}
</style>
