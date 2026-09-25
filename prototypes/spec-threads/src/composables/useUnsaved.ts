import { onBeforeUnmount, onMounted, type Ref } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
export function useUnsaved(dirty: Ref<boolean>) {
  const confirmLeave = () => !dirty.value || confirm('Discard unsaved changes?');
  onBeforeRouteLeave(confirmLeave);
  onBeforeRouteUpdate((to, from) => to.fullPath === from.fullPath || confirmLeave());
  const unload = (e: BeforeUnloadEvent) => { if (dirty.value) { e.preventDefault(); e.returnValue = ''; } };
  onMounted(() => window.addEventListener('beforeunload', unload));
  onBeforeUnmount(() => window.removeEventListener('beforeunload', unload));
}
