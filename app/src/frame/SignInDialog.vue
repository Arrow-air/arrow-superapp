<script setup lang="ts">
import { ref } from 'vue';
import { sendPasswordReset, session, signInWithGitHub, signInWithPassword, signUpWithPassword } from '../lib/session';

// Sign in with the same account as flights.arrowair.com: GitHub, or the email
// and password you use there. New people can make an account here too; the
// forum (dao.arrowair.com) sends its visitors to this box.
const email = ref('');
const password = ref('');
const error = ref('');
const sent = ref('');
const busy = ref(false);
const showEmail = ref(false);
const mode = ref<'signin' | 'signup' | 'reset'>('signin');
function to(m: typeof mode.value) {
  mode.value = m;
  error.value = '';
  sent.value = '';
}
function close() {
  session.signInOpen = false;
  session.signInFor = '';
}
async function withPassword() {
  busy.value = true;
  error.value = '';
  const address = email.value.trim();
  if (mode.value === 'signin') {
    error.value = (await signInWithPassword(address, password.value)) ?? '';
    if (!error.value) session.signInFor = '';
  } else if (mode.value === 'signup') {
    error.value = (await signUpWithPassword(address, password.value)) ?? '';
    if (!error.value) sent.value = `Check ${address}: open the link we sent to confirm it, and you're signed in.`;
  } else {
    error.value = (await sendPasswordReset(address)) ?? '';
    if (!error.value) sent.value = `If ${address} has an Arrow account, a reset link is on its way. It opens flights.arrowair.com to choose a new password.`;
  }
  busy.value = false;
}
async function withGitHub() {
  busy.value = true;
  const { error: e } = await signInWithGitHub();
  if (e) { error.value = e.message; busy.value = false; }
}
</script>

<template>
  <div v-if="session.signInOpen" class="scrim" @click.self="close">
    <div class="dlg" role="dialog" aria-modal="true" aria-labelledby="signin-title">
      <template v-if="session.signInFor === 'forum'">
        <h2 id="signin-title">Sign in to the Arrow forum</h2>
        <p class="sub">Use your Arrow account, the same one as <a href="https://flights.arrowair.com" target="_blank" rel="noopener">flights.arrowair.com</a>. Already on the forum? Use the email address you use there and you keep your forum account.</p>
      </template>
      <template v-else>
        <h2 id="signin-title">Sign in to take part</h2>
        <p class="sub">Reading is open to everyone. To vote, propose and reply, sign in with the same account you use on <a href="https://flights.arrowair.com" target="_blank" rel="noopener">flights.arrowair.com</a>.</p>
      </template>
      <button class="gh" type="button" :disabled="busy" @click="withGitHub">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
        Continue with GitHub
      </button>
      <button v-if="!showEmail" class="link" type="button" @click="showEmail = true">Use email and password instead</button>
      <form v-else class="pw" @submit.prevent="withPassword">
        <input v-model="email" type="email" autocomplete="email" placeholder="Email" aria-label="Email" required />
        <input v-if="mode !== 'reset'" v-model="password" type="password" :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'" :placeholder="mode === 'signup' ? 'Choose a password' : 'Password'" aria-label="Password" required />
        <button class="primary" type="submit" :disabled="busy || !email || (mode !== 'reset' && !password)">
          {{ mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link' }}
        </button>
        <div class="modes">
          <button v-if="mode !== 'signin'" class="link inline" type="button" @click="to('signin')">I have an account</button>
          <button v-if="mode !== 'signup'" class="link inline" type="button" @click="to('signup')">Create an account</button>
          <button v-if="mode === 'signin'" class="link inline" type="button" @click="to('reset')">Forgot password?</button>
        </div>
      </form>
      <p v-if="sent" class="ok">{{ sent }}</p>
      <p v-if="error" class="err">{{ error }}</p>
      <button class="close" type="button" aria-label="Close" @click="close">✕</button>
    </div>
  </div>
</template>

<style scoped>
.scrim { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; background: rgb(0 0 0 / 0.45); backdrop-filter: blur(2px); }
.dlg { position: relative; width: min(380px, calc(100vw - 32px)); padding: 22px; border: 1px solid var(--slate-a5); border-radius: 14px; background: var(--surface); box-shadow: 0 24px 60px -12px rgb(0 0 0 / 0.5); }
h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--fg); }
.sub { margin: 8px 0 16px; color: var(--fg-2); font-size: var(--text-base); line-height: 1.55; }
.sub a { color: var(--indigo-11); }
.gh { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 36px; border: 0; border-radius: 9px; background: var(--fg); color: var(--surface); font: inherit; font-size: var(--text-nav); font-weight: 500; cursor: pointer; }
.gh svg { width: 16px; height: 16px; fill: currentColor; }
.gh:disabled { opacity: 0.6; }
.link { display: block; margin: 12px auto 0; padding: 0; border: 0; background: none; color: var(--fg-muted); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.link:hover { color: var(--fg); }
.pw { display: grid; gap: 8px; margin-top: 14px; }
.pw input { height: 34px; padding: 0 10px; border: 1px solid var(--slate-a5); border-radius: 8px; background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-base); outline: none; }
.primary { height: 34px; border: 0; border-radius: 8px; background: var(--indigo-9); color: #fff; font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer; }
.primary:disabled { opacity: 0.4; }
.modes { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px; margin-top: 4px; }
.link.inline { display: inline; margin: 0; }
.ok { margin: 10px 0 0; color: var(--fg-2); font-size: var(--text-sm); line-height: 1.5; }
.err { margin: 10px 0 0; color: var(--red-11); font-size: var(--text-sm); }
.close { position: absolute; top: 12px; right: 12px; padding: 4px; border: 0; background: none; color: var(--fg-muted); cursor: pointer; }
</style>
