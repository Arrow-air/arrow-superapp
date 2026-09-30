import { createRouter, createWebHashHistory } from 'vue-router';
import { findProject, findTab, findItem, firstItem, projects, tabs } from './frame/nav';

// Every workspace page lives at /:project/:tab/:item. The frame reads those
// params to draw the bar, breadcrumb, tabs and sidebar; the page component
// placed in the slot never needs to know about any of it.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: `/${projects[0].id}/overview/v1-1` },
    // Deliberately broken page, to prove a failing module can't take the frame down.
    { path: '/broken', component: () => import('./pages/Broken.vue') },
    {
      path: '/:project/:tab/:item?',
      component: () => import('./pages/ModuleHost.vue'),
    },
    { path: '/:project', redirect: (to) => `/${to.params.project}/${tabs[0].id}` },
    { path: '/:rest(.*)*', component: () => import('./pages/NotFound.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

// A tab with no page picked opens its first page. This is a global guard
// because beforeEnter doesn't run when only the params change (tab to tab).
router.beforeEach((to) => {
  const tab = findTab(to.params.tab);
  if (!findProject(to.params.project) || !tab) return true; // NotFound handles it
  if (!findItem(tab, to.params.item)) return `/${to.params.project}/${tab.id}/${firstItem(tab).id}`;
});
