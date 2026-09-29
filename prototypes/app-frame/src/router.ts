import { createRouter, createWebHashHistory } from 'vue-router';
import { sections } from './frame/sections';

// The contract between the frame and any page placed inside it.
// A page declares these on its route; the frame reads them and never
// needs to know what the page actually renders.
declare module 'vue-router' {
  interface RouteMeta {
    section?: string;
    title?: string;
    panel?: boolean;
  }
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    ...sections.map((s) => ({
      path: s.path,
      component: () => import('./pages/Placeholder.vue'),
      meta: { section: s.id, title: s.label, panel: s.id === 'specs' },
    })),
    // Deliberately broken page, to prove a failing module can't take the frame down.
    {
      path: '/broken',
      component: () => import('./pages/Broken.vue'),
      meta: { title: 'Broken module' },
    },
    {
      path: '/:rest(.*)*',
      component: () => import('./pages/NotFound.vue'),
      meta: { title: 'Not found' },
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
