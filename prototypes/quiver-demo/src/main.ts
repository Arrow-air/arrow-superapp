import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './styles/tokens.css';
import './styles/base.css';
import './styles/views.css';

import { remote } from './lib/backend';
import { initSession } from './lib/session';

createApp(App).use(router).mount('#app');
// Live mode: load the workspace from the shared Supabase and pick up any session.
if (remote) import('./modules/threads/remote').then(() => initSession());
