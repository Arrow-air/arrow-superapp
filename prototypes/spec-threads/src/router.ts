import { createRouter, createWebHashHistory } from 'vue-router';

// Hash history so the built app works from any static host or sub-path with no rewrite rules.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'projects', component: () => import('./pages/Projects.vue') },
    { path: '/p/:id', name: 'project', component: () => import('./pages/ProjectPage.vue'), props: true },
    { path: '/p/:projectId/freeze/:versionId', name: 'freeze', component: () => import('./pages/Freeze.vue'), props: true },
    { path: '/threads', name: 'threads', component: () => import('./pages/ThreadsList.vue') },
    { path: '/threads/new', name: 'new-thread', component: () => import('./pages/NewThread.vue') },
    { path: '/threads/:id', name: 'thread', component: () => import('./pages/ThreadDetail.vue'), props: true },
    { path: '/register', name: 'register', component: () => import('./pages/Register.vue') },
    { path: '/grants', name: 'grants', component: () => import('./pages/Grants.vue') },
    { path: '/grants/:id', name: 'grant', component: () => import('./pages/GrantDetail.vue'), props: true },
    { path: '/readout', name: 'readout', component: () => import('./pages/Readout.vue') },
    { path: '/how', name: 'how', component: () => import('./pages/HowItWorks.vue') },
    { path: '/profile', name: 'profile', component: () => import('./pages/Profile.vue') },
    // Prototype 1 links.
    { path: '/needs/:id', redirect: (to) => ({ name: 'thread', params: { id: to.params.id } }) },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
