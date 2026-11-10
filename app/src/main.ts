import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './styles/tokens.css';
import './styles/base.css';
import './styles/views.css';

import { remote } from './lib/backend';
import { forumLanding } from './lib/forum';
import { initSession, session } from './lib/session';

// Marks this app's storage as the one flights.arrowair.com shares, so the
// sign-in bridge (public/session-bridge.html) can tell whether it sees it.
if (window.top === window) {
  try { localStorage.setItem('arrow-session-hub', '1'); } catch { /* storage blocked */ }
}

createApp(App).use(router).mount('#app');
// Live mode: load the workspace from the shared Supabase and pick up any session.
// Back from GitHub or an email link while the forum was waiting: finish there
// (after choosing a new password, if a reset link brought them).
if (remote) import('./modules/threads/remote').then(() => initSession()).then(() => {
  if (forumLanding && session.userId && !session.newPassword) void router.replace('/forum/sign-in');
});
