<script setup lang="ts">
import { ref, watch } from 'vue';
import { act, backend, isDemo, projectById, state } from '../data/store';
import { parseTags, tokens } from '../lib/format';
import { tokenTerm } from '../lib/weights';

const tokenBalance = ref(0);
const expertise = ref('');
const location = ref('');
const bio = ref('');
const saved = ref(false);

watch(
  () => state.me,
  (me) => {
    tokenBalance.value = me?.tokenBalance ?? 0;
    expertise.value = (me?.expertise ?? []).join(', ');
    location.value = me?.location ?? '';
    bio.value = me?.bio ?? '';
  },
  { immediate: true },
);

async function save() {
  saved.value = false;
  const ok = await act(() =>
    backend.updateProfile({
      tokenBalance: Number(tokenBalance.value),
      expertise: parseTags(expertise.value),
      location: location.value,
      bio: bio.value,
    }),
  );
  saved.value = ok;
}

const myRoles = () =>
  state.roles.filter((r) => r.memberId === state.me?.id).map((r) => ({ ...r, name: projectById.value.get(r.projectId)?.name ?? r.projectId }));
</script>

<template>
  <h1>Profile</h1>
  <p v-if="!state.me" class="muted">Sign in to edit your profile.</p>

  <div v-else class="layout-2">
    <form class="stack" @submit.prevent="save">
      <div class="card card-subtle">
        <strong>{{ state.me.displayName }}</strong> <span class="muted">@{{ state.me.handle }}</span>
        <div class="row" style="margin-top: 8px; gap: 6px">
          <span v-for="r in myRoles()" :key="r.projectId" class="chip chip-project">{{ r.name }}: {{ r.role }}</span>
          <span v-if="!myRoles().length" class="muted small">No project roles. You vote as a member everywhere.</span>
        </div>
      </div>

      <label class="field-row">
        <span class="label">$ARROW balance</span>
        <input v-model.number="tokenBalance" type="number" min="0" step="1" />
        <div class="hint">
          Self-reported in this prototype. A real version reads it from a linked wallet.
          {{ tokens(Number(tokenBalance) || 0) }} tokens adds
          <b>{{ state.projects[0] ? tokenTerm(Number(tokenBalance) || 0, state.projects[0].weights) : 0 }}</b> to your weight.
        </div>
      </label>
      <label class="field-row">
        <span class="label">Expertise tags, comma separated</span>
        <input v-model="expertise" type="text" placeholder="pcb, firmware, propulsion" />
        <div class="hint">Matched against the tags on each thread.</div>
      </label>
      <label class="field-row">
        <span class="label">Location</span>
        <input v-model="location" type="text" placeholder="Fort Davis, Texas" />
      </label>
      <label class="field-row">
        <span class="label">Bio</span>
        <textarea v-model="bio" style="min-height: 90px; font-family: inherit" />
      </label>
      <div class="row">
        <button class="btn" type="submit">Save</button>
        <span v-if="saved" class="small" style="color: var(--status-success-text)">Saved.</span>
      </div>
    </form>

    <aside class="card small">
      <div class="label">Why we ask</div>
      <p style="margin: 6px 0 0">
        Tokens, expertise, and project role change how much your vote counts. Your role is set per project by an admin, not by you.
      </p>
      <p v-if="isDemo" style="margin-bottom: 0">In demo mode you are editing a fictional persona. Try raising the balance and watching a thread re-rank.</p>
    </aside>
  </div>
</template>
