import { computed, reactive, watch } from 'vue';
import { backend, state } from '../data/store';
import { projectEvidence } from '../data/evidenceState';
import type { ThreadBundle } from '../data/backend';
import type { Decision, Grant, SpecificationSection } from '../lib/types';
import type { ProjectData } from './derive';

const loaded = reactive({
  ready: false,
  bundles: [] as ThreadBundle[],
  decisions: [] as Decision[],
  grants: [] as Grant[],
  sections: [] as SpecificationSection[],
});
let started = false;

async function load() {
  try {
    const [bundles, decisions, grants, sections] = await Promise.all([backend.listBundles(), backend.listDecisions(), backend.listGrants(), backend.listSpecifications()]);
    Object.assign(loaded, { bundles, decisions, grants, sections, ready: true });
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e);
  }
}

/** Shared project data for every workspace view, refreshed after any write or periodic refresh. */
export function useProject() {
  if (!started) {
    started = true;
    watch(() => state.version, load, { immediate: true });
  }
  const data = computed<ProjectData | null>(() => {
    const project = state.projects[0];
    if (!project || !loaded.ready) return null;
    return { project, evidence: projectEvidence, bundles: loaded.bundles, decisions: loaded.decisions, grants: loaded.grants, sections: loaded.sections, members: state.members, roles: state.roles };
  });
  const isLead = computed(() => !!state.me && state.roles.some((r) => r.memberId === state.me!.id && r.role === 'lead'));
  const isMember = computed(() => !!state.me && state.roles.some((r) => r.memberId === state.me!.id));
  return { data, isLead, isMember };
}

export function nameOf(id: string | undefined) {
  if (!id) return 'Unassigned';
  return state.members.find((m) => m.id === id)?.displayName.split(' (')[0] ?? 'Former member';
}
