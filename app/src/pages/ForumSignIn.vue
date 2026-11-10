<script setup lang="ts">
// #/forum/sign-in: where the forum (dao.arrowair.com) sends people to sign in
// with their Arrow account. Signed in already: straight back to the forum.
// Otherwise the sign-in box, then back.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { remote, sb } from '../lib/backend';
import { joinIfSignedIn, session } from '../lib/session';
import { FORUM, forgetForumRequest, forumAnswer, pendingForumRequest, rememberForumRequest, type ForumRequest } from '../lib/forum';

const route = useRoute();
const state = ref<'checking' | 'signin' | 'going' | 'error'>('checking');
const error = ref('');

function request(): ForumRequest | null {
  const { sso, sig } = route.query;
  if (typeof sso === 'string' && typeof sig === 'string' && sso && sig) return { sso, sig };
  return pendingForumRequest();
}

async function finish(r: ForumRequest) {
  state.value = 'going';
  const res = await forumAnswer(r);
  if ('error' in res) {
    // A bad or stale request shouldn't catch the next GitHub or email landing.
    forgetForumRequest();
    state.value = 'error';
    error.value = res.error;
    return;
  }
  forgetForumRequest();
  location.replace(res.url);
}

function openSignIn() {
  session.signInFor = 'forum';
  session.signInOpen = true;
}

onMounted(async () => {
  document.title = 'Sign in to the forum · Arrow';
  const r = request();
  if (!remote || !sb) {
    state.value = 'error';
    error.value = 'Forum sign-in only works on app.arrowair.com.';
    return;
  }
  if (!r) {
    state.value = 'error';
    error.value = 'Start from the forum: open dao.arrowair.com and press Log In.';
    return;
  }
  // Kept for a sign-in that leaves the page: GitHub, or an email confirmation link.
  rememberForumRequest(r);
  const { data } = await sb.auth.getSession();
  if (data.session) return finish(r);
  state.value = 'signin';
  openSignIn();
});

// Staying in the app instead of going back to the forum: join the workspace.
onBeforeUnmount(() => void joinIfSignedIn());

// Signed in through the box: carry on to the forum.
watch(() => session.userId, (id) => {
  const r = request();
  if (id && r && state.value === 'signin') void finish(r);
});
</script>

<template>
  <section class="forum">
    <h1>Arrow forum</h1>
    <template v-if="state === 'checking' || state === 'going'">
      <p class="lead">Signing you in to the forum…</p>
    </template>
    <template v-else-if="state === 'signin'">
      <p class="lead">The forum at dao.arrowair.com uses your Arrow account, the same one as flights.arrowair.com and this app.</p>
      <p class="muted">Already on the forum? Sign in, or create your Arrow account, with the email address you use there and you keep your forum account.</p>
      <button class="primary" type="button" @click="openSignIn">Sign in</button>
    </template>
    <template v-else>
      <p class="lead err">{{ error }}</p>
      <a class="back" :href="FORUM">Back to the forum</a>
    </template>
  </section>
</template>

<style scoped>
.forum { max-width: 460px; margin: 0 auto; padding: var(--space-6) var(--space-4); }
h1 { margin: 0 0 12px; font-size: 18px; font-weight: 600; color: var(--fg); }
.lead { margin: 0 0 10px; color: var(--fg); font-size: var(--text-base); line-height: 1.55; }
.muted { margin: 0 0 16px; color: var(--fg-2); font-size: var(--text-base); line-height: 1.55; }
.err { color: var(--red-11); }
.primary { height: 34px; padding: 0 16px; border: 0; border-radius: 8px; background: var(--indigo-9); color: #fff; font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer; }
.back { color: var(--indigo-11); font-size: var(--text-base); }
</style>
