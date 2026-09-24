import { createRouter, createWebHashHistory } from 'vue-router';

// Hash history so the built app works from any static host or sub-path with no rewrite rules.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'threads', component: () => import('./pages/ThreadsList.vue') },
    { path: '/threads/new', name: 'new-thread', component: () => import('./pages/NewThread.vue') },
    { path: '/threads/:id', name: 'thread', component: () => import('./pages/ThreadDetail.vue'), props: true },
    { path: '/readout', name: 'readout', component: () => import('./pages/Readout.vue') },
    { path: '/how', name: 'how', component: () => import('./pages/HowItWorks.vue') },
    { path: '/profile', name: 'profile', component: () => import('./pages/Profile.vue') },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
