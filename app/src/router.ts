import { createRouter, createWebHashHistory } from 'vue-router';
import { currentProject, findProject, findTab, findItem, firstItem, homePath, projects } from './frame/nav';

// Every workspace page lives at /:project/:tab/:item. The frame reads those
// params to draw the bar, breadcrumb, tabs and sidebar; the page component
// placed in the slot never needs to know about any of it.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: homePath(projects[0]) },
    // Deliberately broken page, to prove a failing module can't take the frame down.
    { path: '/broken', component: () => import('./pages/Broken.vue') },
    // Where dao.arrowair.com sends people to sign in with their Arrow account.
    { path: '/forum/sign-in', component: () => import('./pages/ForumSignIn.vue') },
    // The contributor registry: the join wizard (/join?ref=… is every way in), and Your Arrow.
    { path: '/join', component: () => import('./pages/JoinPage.vue') },
    { path: '/you', component: () => import('./pages/YouPage.vue') },
    // Community: the People list (?view, ?cat, ?q, ?shop, ?call), each person's
    // page, and Reach out (core and leads; phase 1d fills it in). Inside the
    // workspace frame: the params name the project and tab like any other page.
    { path: '/:project(community)/:tab(people)', component: () => import('./pages/community/PeoplePage.vue') },
    { path: '/:project(community)/:tab(people)/:person', component: () => import('./pages/community/PersonPage.vue') },
    { path: '/:project(community)/:tab(reach-out)', component: () => import('./pages/community/ReachOutPage.vue') },
    {
      path: '/:project/:tab/:item?',
      component: () => import('./pages/ModuleHost.vue'),
    },
    { path: '/:project', redirect: (to) => { const p = findProject(to.params.project); return p ? homePath(p) : `/${to.params.project}/overview`; } },
    { path: '/:rest(.*)*', component: () => import('./pages/NotFound.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

// A tab with no page picked opens its first page. This is a global guard
// because beforeEnter doesn't run when only the params change (tab to tab).
// It also keeps currentProject in step, for code outside components.
router.beforeEach((to) => {
  const project = findProject(to.params.project);
  if (project) currentProject.value = project.id;
  const tab = project && findTab(to.params.tab, project.id);
  if (!project || !tab) return true; // NotFound handles it
  const first = firstItem(tab);
  if (!first) return true; // a one-page tab (Community's) has no items
  if (!findItem(tab, to.params.item)) return `/${project.id}/${tab.id}/${first.id}`;
});
