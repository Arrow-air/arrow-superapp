<script setup lang="ts">
// Side drawer that renders one GitHub Discussion through giscus.
// If giscus cannot load the thread (app not installed on the org, network, blocked frame),
// we still show the question and a direct link, so a pin is never a dead end.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ANCHORS, DISCUSS_CATEGORY, DISCUSS_CATEGORY_ID, DISCUSS_REPO, DISCUSS_REPO_ID, discussionUrl } from '../discuss/anchors';
import { closeDiscussion, openAnchor } from '../discuss/drawer';

const host = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const status = ref<'loading' | 'ready' | 'error'>('loading');
const errorText = ref('');
const anchor = computed(() => (openAnchor.value ? ANCHORS[openAnchor.value] : null));
let lastFocus: HTMLElement | null = null;
let slow: ReturnType<typeof setTimeout> | undefined;

function mount() {
  if (!host.value || !anchor.value) return;
  host.value.innerHTML = '';
  status.value = 'loading';
  errorText.value = '';
  const s = document.createElement('script');
  s.src = 'https://giscus.app/client.js';
  s.async = true;
  s.crossOrigin = 'anonymous';
  const attrs: Record<string, string> = {
    'data-repo': DISCUSS_REPO,
    'data-repo-id': DISCUSS_REPO_ID,
    'data-category': DISCUSS_CATEGORY,
    'data-category-id': DISCUSS_CATEGORY_ID,
    'data-mapping': 'number',
    'data-term': String(anchor.value.number),
    'data-strict': '1',
    'data-reactions-enabled': '1',
    'data-emit-metadata': '1',
    'data-input-position': 'top',
    'data-theme': 'light',
    'data-lang': 'en',
    'data-loading': 'eager',
  };
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  s.onerror = () => fail('Could not reach giscus.');
  host.value.appendChild(s);
  clearTimeout(slow);
  slow = setTimeout(() => status.value === 'loading' && fail('The discussion is taking too long to load.'), 12000);
}

function fail(msg: string) {
  status.value = 'error';
  errorText.value = msg;
  if (host.value) host.value.innerHTML = '';
}

function onMessage(e: MessageEvent) {
  if (e.origin !== 'https://giscus.app') return;
  const data = (e.data as { giscus?: { error?: string; discussion?: unknown; resizeHeight?: number } } | null)?.giscus;
  if (!data) return;
  if (data.error) {
    const notInstalled = /not installed/i.test(data.error);
    fail(notInstalled ? 'In-app comments are not switched on yet.' : data.error);
  } else if (data.discussion || data.resizeHeight) {
    clearTimeout(slow);
    status.value = 'ready';
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && openAnchor.value) closeDiscussion();
}

watch(openAnchor, async (key) => {
  if (key) {
    lastFocus = document.activeElement as HTMLElement | null;
    await nextTick();
    mount();
    panel.value?.focus();
  } else {
    clearTimeout(slow);
    lastFocus?.focus?.();
  }
});

onMounted(() => {
  window.addEventListener('message', onMessage);
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage);
  window.removeEventListener('keydown', onKey);
  clearTimeout(slow);
});
</script>

<template>
  <Transition name="drawer">
    <div v-if="openAnchor && anchor" class="drawer-wrap">
      <div class="drawer-scrim" @click="closeDiscussion" />
      <aside ref="panel" class="drawer" role="dialog" aria-modal="true" :aria-label="`Discussion: ${anchor.title}`" tabindex="-1">
        <header class="drawer-head">
          <div>
            <div class="label">Discussion · pinned to this feature</div>
            <h2 class="drawer-title">{{ anchor.title }}</h2>
            <p class="drawer-hook">{{ anchor.hook }}</p>
          </div>
          <button class="drawer-close" aria-label="Close discussion" @click="closeDiscussion">✕</button>
        </header>
        <div class="drawer-body">
          <p class="small muted" style="margin-top: 0">
            Stored as a GitHub Discussion in the superapp repo, shown here next to the thing it is about.
            Sign in with GitHub to reply.
            <a :href="discussionUrl(openAnchor)" target="_blank" rel="noopener">Open on GitHub ↗</a>
          </p>
          <p v-if="status === 'loading'" class="muted small">Loading the thread…</p>
          <div v-if="status === 'error'" class="card card-subtle">
            <strong>{{ errorText }}</strong>
            <p class="small" style="margin: 6px 0 12px">The thread exists and is open. Read it and reply on GitHub for now.</p>
            <a class="btn" :href="discussionUrl(openAnchor)" target="_blank" rel="noopener">Open the discussion on GitHub ↗</a>
          </div>
          <div ref="host" class="giscus-host" />
        </div>
      </aside>
    </div>
  </Transition>
</template>
