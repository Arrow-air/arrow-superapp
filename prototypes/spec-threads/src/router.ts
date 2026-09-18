import { createRouter, createWebHashHistory } from 'vue-router';

// Hash history so the built app works from any static host or sub-path with no rewrite rules.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'needs', component: () => import('./pages/NeedsList.vue') },
    { path: '/needs/new', name: 'new-need', component: () => import('./pages/NewNeed.vue') },
    { path: '/needs/:id', name: 'need', component: () => import('./pages/NeedDetail.vue'), props: true },
    { path: '/readout', name: 'readout', component: () => import('./pages/Readout.vue') },
    { path: '/how', name: 'how', component: () => import('./pages/HowItWorks.vue') },
    { path: '/profile', name: 'profile', component: () => import('./pages/Profile.vue') },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
