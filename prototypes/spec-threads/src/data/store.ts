// App-wide reactive state: which backend, who you are, and the slow-changing reference data.

import { computed, reactive } from 'vue';
import type { Member, Project, ProjectRole, Version } from '../lib/types';
import type { Backend } from './backend';
import { DemoBackend } from './demoBackend';
import { SupabaseBackend } from './supabaseBackend';

function makeBackend(): Backend {
  const kind = import.meta.env.VITE_BACKEND ?? 'demo';
  if (kind === 'supabase') {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error('VITE_BACKEND=supabase needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
    }
    return new SupabaseBackend(url, key);
  }
  return new DemoBackend();
}

export const backend: Backend = makeBackend();

export const state = reactive({
  ready: false,
  me: null as Member | null,
  members: [] as Member[],
  roles: [] as ProjectRole[],
  projects: [] as Project[],
  error: '' as string,
  /** Bumped after any write so pages know to refetch. */
  version: 0,
});

export const isDemo = backend.kind === 'demo';

export const memberById = computed(() => new Map(state.members.map((m) => [m.id, m])));
export const projectById = computed(() => new Map(state.projects.map((p) => [p.id, p])));

export function versionOf(projectId: string, versionId: string): Version | undefined {
  return projectById.value.get(projectId)?.versions.find((v) => v.id === versionId);
}

export function handleOf(memberId: string): string {
  return memberById.value.get(memberId)?.handle ?? 'unknown';
}

export function myRoleOn(projectId: string) {
  return state.me ? state.roles.find((r) => r.projectId === projectId && r.memberId === state.me!.id)?.role : undefined;
}

export async function refresh() {
  try {
    const [me, members, roles, projects] = await Promise.all([
      backend.currentMember(),
      backend.listMembers(),
      backend.listRoles(),
      backend.listProjects(),
    ]);
    state.me = me;
    state.members = members;
    state.roles = roles;
    state.projects = projects;
    state.error = '';
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e);
  } finally {
    state.ready = true;
    state.version += 1;
  }
}

/** Run a write, surface any error in the banner, then refetch. Returns true on success. */
export async function act(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    await refresh();
    return true;
  } catch (e) {
    state.error = e instanceof Error ? e.message : String(e);
    return false;
  }
}
