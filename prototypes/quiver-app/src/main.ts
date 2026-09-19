import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './styles/quiver.css';

createApp(App).use(router).mount('#app');
