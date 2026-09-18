import { ref } from 'vue';
import type { AnchorKey } from './anchors';

/** Which pin's thread is open in the drawer. One at a time. */
export const openAnchor = ref<AnchorKey | null>(null);
export const openDiscussion = (key: AnchorKey) => (openAnchor.value = key);
export const closeDiscussion = () => (openAnchor.value = null);
