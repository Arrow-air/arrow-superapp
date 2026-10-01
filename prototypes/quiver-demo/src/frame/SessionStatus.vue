<script setup lang="ts">
import { session } from '../lib/session';
// Footer status in the live app: who you are and your role, or how to join.
</script>

<template>
  <span v-if="session.member" class="st" :title="session.email">
    <span class="live" aria-hidden="true"></span>
    {{ session.member.display_name }}<span class="role"> · {{ session.member.role }}</span>
  </span>
  <button v-else class="st btn" type="button" @click="session.signInOpen = true">
    <span class="live off" aria-hidden="true"></span>
    Read-only · Sign in to take part
  </button>
</template>

<style scoped>
.st { display: inline-flex; align-items: center; gap: 6px; color: var(--fg-muted); }
.btn { padding: 0; border: 0; background: none; font: inherit; cursor: pointer; }
.btn:hover { color: var(--fg); }
.live { width: 7px; height: 7px; border-radius: 50%; background: var(--jade-9); }
.live.off { background: var(--slate-8); }
.role { color: var(--fg-faint); }
</style>
