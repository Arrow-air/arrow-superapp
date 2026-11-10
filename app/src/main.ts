import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './styles/tokens.css';
import './styles/base.css';
import './styles/views.css';

import { remote } from './lib/backend';
import { forumLanding } from './lib/forum';
import { initSession, session } from './lib/session';

createApp(App).use(router).mount('#app');
// Live mode: load the workspace from the shared Supabase and pick up any session.
// Back from GitHub or an email link while the forum was waiting: finish there.
if (remote) import('./modules/threads/remote').then(() => initSession()).then(() => {
  if (forumLanding && session.userId) void router.replace('/forum/sign-in');
});
