import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { findItem, findProject, findTab } from './nav';

// The frame's view of where we are, derived from the route.
export function useWorkspace() {
  const route = useRoute();
  const project = computed(() => findProject(route.params.project));
  const tab = computed(() => findTab(route.params.tab));
  const item = computed(() => findItem(tab.value, route.params.item));
  const base = computed(() => `/${project.value?.id ?? ''}`);
  return { route, project, tab, item, base };
}
