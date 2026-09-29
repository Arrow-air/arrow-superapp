import { ref, watch } from 'vue';

// Whether the section sidebar is collapsed to its icon rail. A per-viewer
// preference, so it lives in localStorage.
const KEY = 'arrow.sidebar-collapsed';
const read = () => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};
export const sidebarCollapsed = ref(read());
watch(sidebarCollapsed, (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* storage unavailable */ } });
export const toggleSidebar = () => (sidebarCollapsed.value = !sidebarCollapsed.value);
