import { onBeforeUnmount } from 'vue';

// Platform-aware modifier: ⌘ on Apple devices, Ctrl elsewhere.
export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD = isMac ? '⌘' : 'Ctrl';

// Bind a Cmd/Ctrl + key shortcut for the lifetime of the calling component.
export function useShortcut(key: string, handler: () => void) {
  const onKey = (e: KeyboardEvent) => {
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === key) {
      e.preventDefault();
      handler();
    }
  };
  window.addEventListener('keydown', onKey);
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
}
