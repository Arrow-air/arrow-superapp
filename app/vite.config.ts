import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Relative base + hash routing: the built app runs from any static host or sub-path.
export default defineConfig({
  base: './',
  // <kicanvas-embed> is KiCanvas's web component (public/vendor/kicanvas.js), not a Vue component.
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('kicanvas-') } } })],
});
