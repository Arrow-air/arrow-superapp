import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './styles/workspace.css';

createApp(App).use(router).mount('#app');

import './styles/records.css';

import "./styles/briefing.css";
import './styles/sourced.css';
import './styles/project.css';
