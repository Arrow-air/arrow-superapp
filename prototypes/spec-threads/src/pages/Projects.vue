<script setup lang="ts">
// Front door. One card per project: what is being built, what is being discussed, and the
// honest line from the 2026-09-23 call: your ideas land in the next version, not this one.
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { backend, handleOf, isDemo, state } from '../data/store';
import { VERSION_STATE_LABEL } from '../lib/labels';
import type { Thread } from '../lib/types';
import { buildingVersion, discussingVersion, freezeCheck } from '../lib/versions';

const threads = ref<Thread[]>([]);
const loading = ref(true);

// First-visit guide. Demo only. Remembered per browser; "Reset demo data" brings it back.
const GUIDE_KEY = 'arrow-spec-threads-guide-dismissed';
const readDismissed = () => {
  try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch { return false; }
};
const guideOpen = ref(isDemo && !readDismissed());
watch(() => state.version, () => { if (isDemo && !readDismissed()) guideOpen.value = true; });
function dismissGuide() {
  guideOpen.value = false;
  try { localStorage.setItem(GUIDE_KEY, '1'); } catch { /* private mode: fine, it just shows again */ }
}

watch(
  () => state.version,
  async () => {
    try {
      threads.value = await backend.listThreads();
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

const cards = computed(() =>
  state.projects.map((p) => {
    const building = buildingVersion(p);
    const discussing = discussingVersion(p);
    const check = discussing ? freezeCheck(p, discussing.id, threads.value) : null;
    const lead = state.roles.find((r) => r.projectId === p.id && r.role === 'lead');
    return { p, building, discussing, check, lead: lead ? handleOf(lead.memberId) : null };
  }),
);
</script>

<template>
  <div class="page-header">
    <h1 style="border: 0; margin: 0; padding: 0">Projects</h1>
    <p class="muted" style="margin: 6px 0 0; max-width: 760px">
      Each project is building one version and discussing the next. Threads are addressed to the version in discussion.
      When the lead freezes it, every thread gets resolved: rejected, promoted to a spec, turned into a grant, or deferred.
    </p>
  </div>

  <section v-if="guideOpen" class="guide" aria-label="How to try this demo">
    <div class="spread" style="align-items: center">
      <strong>Three minutes to see the idea</strong>
      <button class="link-btn small" @click="dismissGuide">Hide this</button>
    </div>
    <ol class="guide-steps">
      <li>
        <b>Open Spearhead.</b>
        PT1 is being built. PT2 is in discussion with a freeze date. Outside ideas go to PT2, so they do not become noise for the PT1 team.
        <RouterLink :to="{ name: 'project', params: { id: 'spearhead' } }">Open it →</RouterLink>
      </li>
      <li>
        <b>Read the engine PCB thread and vote.</b>
        Use <em>Acting as</em> in the top bar to be the expert, the newcomer, or the lead. Votes are weighted; watch the positions re-rank.
      </li>
      <li>
        <b>Be Omar and freeze PT2.</b>
        The freeze screen lists every open thread and makes you resolve each one. Turn the engine thread into a grant and see the draft it writes.
        <RouterLink :to="{ name: 'freeze', params: { projectId: 'spearhead', versionId: 'sh-pt2' } }">Freeze screen →</RouterLink>
      </li>
    </ol>
    <div class="small muted">
      Then look at the <RouterLink to="/register">register</RouterLink>, the <RouterLink to="/grants">grants</RouterLink>, and the <RouterLink to="/readout">readout</RouterLink>.
      See a <b>Discuss</b> pin? Click it to argue about that exact feature. Replies are GitHub Discussions, shown right here.
    </div>
  </section>

  <p v-if="loading" class="muted">Loading…</p>
  <div v-else class="project-grid">
    <RouterLink v-for="c in cards" :key="c.p.id" :to="{ name: 'project', params: { id: c.p.id } }" class="project-card">
      <div class="spread" style="align-items: baseline">
        <h2 style="margin: 0; border: 0; padding: 0">{{ c.p.name }}</h2>
        <span v-if="c.lead" class="small muted">lead @{{ c.lead }}</span>
      </div>
      <div class="project-versions">
        <div v-if="c.building" class="project-version">
          <span class="label">{{ VERSION_STATE_LABEL.building }}</span>
          <span class="project-version-name">{{ c.building.name }}</span>
          <span class="small muted">closed to outside ideas</span>
        </div>
        <div v-if="c.discussing" class="project-version is-discussing">
          <span class="label">{{ VERSION_STATE_LABEL.discussing }}</span>
          <span class="project-version-name">{{ c.discussing.name }}</span>
          <span class="small">
            <b>{{ c.check?.open.length ?? 0 }}</b> open · {{ c.check?.resolved.length ?? 0 }} resolved
            <template v-if="c.discussing.freezeTarget"> · freeze {{ c.discussing.freezeTarget }}</template>
          </span>
        </div>
        <div v-else class="project-version">
          <span class="label">nothing in discussion</span>
          <span class="small muted">every version is built or frozen</span>
        </div>
      </div>
      <div v-if="c.p.id === 'quiver-mini'" class="small muted" style="margin-top: 10px">
        Empty on purpose: the re-run of the earlier Quiver Mini experiment. Threads could be seeded from the repos by Vector.
      </div>
    </RouterLink>
  </div>
</template>
