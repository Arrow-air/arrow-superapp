import { createRouter, createWebHashHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: () => import('./pages/Home.vue') },
    { path: '/aircraft/:id?', component: () => import('./pages/Aircraft.vue'), props: true },
    { path: '/attachments', component: () => import('./pages/Attachments.vue') },
    { path: '/decisions', component: () => import('./pages/Decisions.vue') },
    { path: '/decisions/:id', component: () => import('./pages/DecisionDetail.vue'), props: true },
    { path: '/work', component: () => import('./pages/Work.vue') },
    { path: '/work/spec', component: () => import('./pages/SpecDoc.vue') },
    { path: '/work/:id', component: () => import('./pages/TaskDetail.vue'), props: true },
    { path: '/money', component: () => import('./pages/Money.vue') },
    { path: '/flights', component: () => import('./pages/Flights.vue') },
    { path: '/guides', component: () => import('./pages/Guides.vue') },
    { path: '/market', component: () => import('./pages/Market.vue') },
  ],
});
