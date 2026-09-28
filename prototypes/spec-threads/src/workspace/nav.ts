import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { computed } from 'vue';

export type View = 'overview' | 'model' | 'discussions' | 'spec' | 'work' | 'people' | 'sources' | 'inbox' | 'freeze' | 'search';
export const views: View[] = ['overview', 'model', 'discussions', 'spec', 'work', 'people', 'sources', 'inbox', 'freeze', 'search'];
// Older links keep working.
const legacy: Record<string, View> = { shape: 'discussions', design: 'spec', review: 'freeze', register: 'spec', grants: 'work' };

export function useNav() {
  const route = useRoute(), router = useRouter();
  const view = computed<View>(() => {
    const v = String(route.query.view ?? '');
    return (views as string[]).includes(v) ? (v as View) : legacy[v] ?? (route.query.thread || route.query.record && !route.query.view ? 'discussions' : route.query.grant ? 'work' : route.query.decision ? 'spec' : 'overview');
  });
  const q = (key: string) => (route.query[key] ? String(route.query[key]) : '');
  function to(next: View, query: LocationQueryRaw = {}) {
    return { path: '/p/spearhead', query: { view: next === 'overview' ? undefined : next, ...query } };
  }
  function go(next: View, query: LocationQueryRaw = {}) {
    return router.push(to(next, query));
  }
  /** Keep the current view and replace some query fields (filters, search). */
  function patch(query: LocationQueryRaw) {
    return router.replace({ query: { ...route.query, ...query } });
  }
  return { route, router, view, q, to, go, patch };
}
