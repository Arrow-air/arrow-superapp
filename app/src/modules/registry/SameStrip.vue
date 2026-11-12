<script setup lang="ts">
import { ref } from 'vue';
import { day } from './community';
import { linkPerson, type Match } from '../../lib/registry';

// "Same person?" cards, for leads: someone signed up who may be a person the
// team added, and nothing proves it (only the name matched, or an email that
// isn't proven). Link them folds the account into the team's record
// (sa_link_person); Different people keeps them apart. Above the People
// list, and on the record's own page.
const props = defineProps<{ matches: Match[]; personName?: string }>();
const emit = defineEmits<{ settled: [] }>();

const busy = ref('');
const msg = ref('');
const err = ref('');
async function settle(m: Match, same: boolean) {
  busy.value = m.id;
  err.value = '';
  const rec = m.person_name ?? props.personName ?? 'the record';
  const acct = m.account_name ?? 'the account';
  try {
    await linkPerson(m.id, same);
    msg.value = same ? `Linked: ${rec}'s record now has ${acct}'s account.` : `Kept apart: ${acct} and ${rec} are different people.`;
    emit('settled');
  } catch (e) {
    err.value = (e as Error).message;
  } finally {
    busy.value = '';
  }
}
</script>

<template>
  <section v-if="matches.length || msg || err" class="rg same" aria-label="Same person?">
    <div v-for="m in matches" :key="m.id" class="callout plum match" data-match>
      <span class="acct">same person?</span>
      <div class="grow">
        <b>{{ m.account_name ?? 'Someone' }}</b> signed up {{ day(m.created_at) }} and may be
        <RouterLink v-if="m.person_id" class="link" :to="`/community/people/${m.person_id}`">{{ m.person_name ?? personName ?? 'a person' }}</RouterLink><template v-else>{{ personName ?? 'this person' }}</template>,
        whose record the team added <span class="faint">({{ m.reason }})</span>. Nothing proves it, so a lead decides.
      </div>
      <div class="btns">
        <button class="btn sm" type="button" :disabled="busy === m.id" data-link @click="settle(m, true)">Link them</button>
        <button class="btn sm ghost" type="button" :disabled="busy === m.id" data-different @click="settle(m, false)">Different people</button>
      </div>
    </div>
    <p v-if="msg" class="done" role="status" data-linkmsg>{{ msg }}</p>
    <p v-if="err" class="err" role="alert">{{ err }}</p>
  </section>
</template>

<style scoped>
.same { display: grid; gap: 8px; margin-top: 14px; }
.match { align-items: center; }
.grow { flex: 1; min-width: 0; }
.btns { display: flex; gap: 6px; flex: none; }
.done { margin: 0; color: var(--jade-11); font-size: var(--text-base); }
.err { margin: 0; }
@media (max-width: 767px) {
  .match { flex-wrap: wrap; }
  .match .grow { flex-basis: calc(100% - 100px); }
}
</style>
