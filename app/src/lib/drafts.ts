import { ref, watch } from 'vue';

// Unsent text survives a lost connection, a closed panel or a reload: each
// composer keeps its draft in this browser until the server confirms the
// save. Each draft also gets a send key, made on the first try and reused on
// every retry, so a save that did land but whose answer was lost isn't
// posted twice.

const TEXT = 'superapp:draft:';
const KEY = 'superapp:draft-key:';
const get = (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } };
const set = (k: string, v: string) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch { /* private mode */ } };
// randomUUID needs a secure context; the LAN preview is plain http.
const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export function useDraft(name: () => string) {
  const text = ref(get(TEXT + name()));
  watch(name, (n) => (text.value = get(TEXT + n)));
  watch(text, (v) => set(TEXT + name(), v.trim() ? v : ''));
  /** The retry key for this draft: made on the first send, kept until it's saved. */
  const sendKey = () => {
    let k = get(KEY + name());
    if (!k) { k = newKey(); set(KEY + name(), k); }
    return k;
  };
  /** Saved: forget the text and its key. */
  // Straight to storage: the composer may already be closing, its watchers stopped.
  const done = () => { set(TEXT + name(), ''); set(KEY + name(), ''); text.value = ''; };
  return { text, sendKey, done };
}
