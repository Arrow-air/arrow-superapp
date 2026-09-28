<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import DiscussDrawer from './components/DiscussDrawer.vue';
import SpearheadWorkspace from './components/SpearheadWorkspace.vue';
import WorkspaceShell from './workspace/WorkspaceShell.vue';
import { isRealProjectData, isSharedProject, realWorkspaceUrl } from './data/projectDataMode';
import {projectEvidence as spearhead, refreshEvidence, evidenceSync} from './data/evidenceState';
import { act, backend, isDemo, refresh, state } from './data/store';

const realBuildAvailable = import.meta.env.VITE_PROJECT_DATA === 'spearhead';
const route = useRoute();
const router = useRouter();
const activeProject = computed(() => String(route.params.id ?? route.params.projectId ?? route.query.project ?? 'spearhead'));
onMounted(() => { if(isSharedProject)refreshEvidence(); if (!isRealProjectData || isSharedProject) refresh(); });
watch(()=>route.fullPath,()=>{if(isSharedProject&&state.ready)void refresh()});
let refreshTimer:ReturnType<typeof setInterval>|undefined;
onMounted(()=>{if(isSharedProject)refreshTimer=setInterval(()=>{if(document.visibilityState==='visible')void refresh()},30000)});
onUnmounted(()=>clearInterval(refreshTimer));
const visibleProjects = computed(() => isRealProjectData ? [{ id: 'spearhead', name: 'Spearhead' }] : state.projects);
function skipToMain() {
  const main = document.getElementById('main-content');
  main?.focus();
  main?.scrollIntoView();
}
async function switchPersona(e: Event) {
  const id = (e.target as HTMLSelectElement).value;
  await act(() => (id ? backend.actAs!(id) : backend.signOut()));
}
async function resetDemo() {
  if (!confirm('Discard your changes in this browser and restore the example workspace?')) return;
  await act(() => backend.reset!());
  await router.push('/p/spearhead');
}
</script>

<template>
  <a class="skip-link" href="#main-content" @click.prevent="skipToMain">Skip to workspace</a>
  <header class="workspace-topbar">
    <RouterLink to="/" class="workspace-brand" aria-label="Arrow home"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 27 16 4l11 23-11-7z" fill="currentColor"/><path d="M16 12v8" stroke="#fff" stroke-width="2"/></svg> ARROW <span> / </span><small>{{ isSharedProject ? 'WORKSPACE' : 'PROJECT WORKSPACE' }}</small></RouterLink>
    <div v-if="!isRealProjectData || isSharedProject" class="topbar-account">
      <label v-if="isDemo" class="persona"><span>Explore as</span><select aria-label="Demo persona" :value="state.me?.id ?? ''" @change="switchPersona"><option value="">Signed out</option><option v-for="m in state.members" :key="m.id" :value="m.id">{{ m.displayName }}</option></select></label>
      <button v-else class="btn btn-ghost" @click="act(() => state.me ? backend.signOut() : backend.signIn())">{{ state.me ? 'Sign out' : 'Sign in' }}</button>
      <RouterLink v-if="state.me" to="/profile" class="account-avatar" title="Your profile">{{ state.me.displayName.slice(0, 1) }}</RouterLink>
    </div>
  </header>
  <div class="workspace-shell" :class="{ 'workspace-shell-shared': isSharedProject }">
    <aside v-if="!isSharedProject" class="workspace-rail">
      <div class="rail-heading">Projects <span>{{ String(visibleProjects.length).padStart(2, '0') }}</span></div>
      <nav class="project-navigation" aria-label="Projects">
        <RouterLink v-for="p in visibleProjects" :key="p.id" :to="`/p/${p.id}`" :class="{ active: activeProject === p.id && route.name === 'project' }"><span class="project-glyph">{{ p.name.slice(0, 1) }}</span><span>{{ p.name }}</span><span class="project-arrow">↗</span></RouterLink>
      </nav>
      <nav v-if="isRealProjectData" class="rail-tools" aria-label="Workspace resources"><RouterLink to="/p/spearhead?view=sources">Sources & coverage ↗</RouterLink></nav>
      <nav v-else class="rail-tools" aria-label="Workspace resources"><RouterLink to="/how">How this works ↗</RouterLink><RouterLink to="/readout">Experiment readout ↗</RouterLink><details><summary>Browse all records</summary><RouterLink to="/projects">Projects</RouterLink><RouterLink to="/threads">Threads</RouterLink><RouterLink to="/register">Register</RouterLink><RouterLink to="/grants">Grants</RouterLink></details></nav>
    </aside>
    <div class="workspace-main">
      <div v-if="isRealProjectData && !isSharedProject" class="workspace-demo sourced-banner"><span><strong>{{ isSharedProject ? 'Spearhead workspace' : 'Spearhead snapshot' }}</strong> · <template v-if="isSharedProject">Shared collaboration · Evidence through {{ spearhead.asOf }}.</template><template v-else>Updated {{ spearhead.asOf }}. Read-only; not live-synced.</template></span><RouterLink to="/p/spearhead?view=sources">View sources</RouterLink></div>
      <div v-else-if="isDemo" class="workspace-demo"><span><strong>Concept preview</strong><span class="demo-description"> · Example people & engineering. Changes stay in your browser.</span><span class="mobile-demo-description"> · Illustrative, browser-only demo.</span></span><a v-if="realBuildAvailable" :href="realWorkspaceUrl" class="link-btn">Real Spearhead view</a><button class="link-btn" @click="resetDemo">Reset demo data</button></div>
      <div v-if="evidenceSync.error" class="error-banner" role="alert">{{evidenceSync.error}} <button @click="refreshEvidence">Retry</button></div><div v-if="state.error" class="error-banner" role="alert"><span>{{ state.error }}</span><button v-if="isSharedProject" class="link-btn" @click="refresh">Reload shared records</button><button class="link-btn" @click="state.error = ''">Dismiss</button></div>
      <main id="main-content" tabindex="-1" class="page" :class="{ 'workspace-page': route.name === 'project' }"><template v-if="isSharedProject && route.name === 'project'"><WorkspaceShell v-if="route.params.id === 'spearhead'" /><section v-else class="pw pw-empty"><h2>Project not found</h2><p>This workspace only holds Spearhead for now.</p><RouterLink to="/p/spearhead">Go to Spearhead →</RouterLink></section></template><SpearheadWorkspace v-else-if="isRealProjectData && (!isSharedProject || route.name === 'project')" /><RouterView v-else-if="state.ready" :key="route.path" /><p v-else class="muted">Opening workspace…</p></main>
      <footer class="workspace-footer"><span>ARROW / OPEN AIRCRAFT DEVELOPMENT</span><a href="https://github.com/Arrow-air/arrow-superapp" target="_blank" rel="noopener">App repository ↗</a></footer>
    </div>
  </div>
  <DiscussDrawer v-if="!isRealProjectData" />
</template>
