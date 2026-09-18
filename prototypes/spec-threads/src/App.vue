<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import DiscussDrawer from './components/DiscussDrawer.vue';
import DiscussPin from './components/DiscussPin.vue';
import { act, backend, isDemo, refresh, state } from './data/store';

onMounted(refresh);

async function switchPersona(e: Event) {
  const id = (e.target as HTMLSelectElement).value;
  await act(() => (id ? backend.actAs!(id) : backend.signOut()));
}

async function resetDemo() {
  if (!confirm('Discard everything you changed in this browser and restore the seeded threads?')) return;
  try { localStorage.removeItem('arrow-spec-threads-guide-dismissed'); } catch { /* ignore */ }
  await act(() => backend.reset!());
}
</script>

<template>
  <header class="nav">
    <div class="nav-inner">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">ARROW</span>
        <span class="brand-sub">spec threads · prototype</span>
      </RouterLink>
      <nav class="nav-links">
        <RouterLink to="/">Needs</RouterLink>
        <RouterLink to="/readout">Readout</RouterLink>
        <RouterLink to="/how">How weighting works</RouterLink>
      </nav>
      <div class="nav-user">
        <template v-if="isDemo">
          <label class="persona">
            <span>Acting as</span>
            <select :value="state.me?.id ?? ''" @change="switchPersona">
              <option value="">Signed out</option>
              <option v-for="m in state.members" :key="m.id" :value="m.id">{{ m.displayName }}</option>
            </select>
          </label>
        </template>
        <template v-else>
          <button v-if="!state.me" class="btn btn-on-dark" @click="act(() => backend.signIn())">Sign in with GitHub</button>
          <button v-else class="btn btn-on-dark" @click="act(() => backend.signOut())">Sign out</button>
        </template>
        <RouterLink v-if="state.me" to="/profile" class="me" title="Edit this profile">@{{ state.me.handle }}</RouterLink>
      </div>
    </div>
  </header>

  <div v-if="isDemo" class="demo-strip">
    <span>
      <strong>Demo.</strong> Fictional people, illustrative numbers. Your changes stay in this browser.
    </span>
    <span class="row" style="gap: 14px; flex-wrap: nowrap">
      <DiscussPin anchor="general" label="Feedback" />
      <button class="link-btn" @click="resetDemo">Reset demo data</button>
    </span>
  </div>

  <div v-if="state.error" class="error-banner" role="alert">
    <span>{{ state.error }}</span>
    <button class="link-btn" @click="state.error = ''">Dismiss</button>
  </div>

  <main class="page">
    <RouterView v-if="state.ready" />
    <p v-else class="muted">Loading…</p>
  </main>

  <DiscussDrawer />

  <footer class="foot">
    An Arrow superapp experiment. Source and the thinking behind it:
    <a href="https://github.com/Arrow-air/arrow-superapp" target="_blank" rel="noopener">Arrow-air/arrow-superapp</a>
  </footer>
</template>
