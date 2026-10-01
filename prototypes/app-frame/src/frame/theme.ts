import { ref, watch } from 'vue';

// Colour theme: follow the OS, or force light or dark. Stored per viewer and
// applied as data-theme on <html>; index.html applies it before first paint.
export type Theme = 'system' | 'light' | 'dark';
const KEY = 'arrow.theme';
const read = (): Theme => {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch { return 'system'; }
};
export const theme = ref<Theme>(read());
watch(theme, (t) => {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* storage unavailable */ }
}, { immediate: true });
