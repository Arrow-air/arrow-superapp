import { createRouter, createWebHashHistory } from 'vue-router';
import { isRealProjectData, isSharedProject } from './data/projectDataMode';

// Hash history so the built app works from any static host or sub-path with no rewrite rules.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path:'/sign-in', name:'sign-in', component:()=>import('./pages/SignIn.vue') },
    { path:'/join', name:'join', component:()=>import('./pages/SignIn.vue') },
    { path: '/', redirect: '/p/spearhead' },
    { path: '/projects', name: 'projects', component: () => import('./pages/Projects.vue') },
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
  scrollBehavior: (to, from, saved) => {
    if (saved) return saved;
    if (to.path === from.path && to.query.view === from.query.view) return false;
    return { top: 0 };
  },
});

// The shared workspace has one project page; older sandbox routes land on the matching view.
const sharedViews: Record<string, string | undefined> = { '/how': undefined, '/readout': 'freeze', '/register': 'spec', '/grants': 'work', '/threads': 'discussions', '/projects': undefined, '/threads/new': 'discussions' };
router.beforeEach(to => {
  if (isSharedProject && to.path in sharedViews) return { path: '/p/spearhead', query: { view: sharedViews[to.path] }, replace: true };
  if (isSharedProject && to.name === 'freeze') return { path: '/p/spearhead', query: { view: 'freeze' }, replace: true };
  if (isSharedProject && to.name === 'thread') return { path: '/p/spearhead', query: { view: 'discussions', thread: String(to.params.id) }, replace: true };
  if (isSharedProject && to.name === 'grant') return { path: '/p/spearhead', query: { view: 'work', grant: String(to.params.id) }, replace: true };
  if (isRealProjectData && !isSharedProject && to.path !== '/p/spearhead') return { path: '/p/spearhead', query: to.query, replace: true };
  return true;
});
