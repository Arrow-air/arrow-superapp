<script setup lang="ts">
import { ref } from 'vue';
import { day } from './community';
import { linkPerson, type Match } from '../../lib/registry';

// "Same person?" cards, for leads: someone signed up who may be a person the
// team added, and nothing proves it (only the name matched, or an email that
// isn't proven). Each card lists what a lead judges by: the account's email,
// GitHub and Discord as its sign-in proved them and when it was made, and what
// the record holds, resolved to an account or not. Link them folds the account
// into the team's record (sa_link_person), which the database refuses when the
// record holds a GitHub or Discord account the account doesn't sign in with;
// the card then says why. Different people keeps them apart. Above the People
// list, and on the record's own page.
const props = defineProps<{ matches: Match[]; personName?: string }>();
const emit = defineEmits<{ settled: [] }>();

const busy = ref('');
const msg = ref('');
const err = ref('');
/** Why the database refused a card's link, by card. */
const refused = ref<Record<string, string>>({});
const handle = (h: string | null | undefined, at = false) => (h ? `${at ? '@' : ''}${h}` : '');
/** The account's side and the record's, as lines: [label, account, record, record resolved?]. */
function evidence(m: Match): { label: string; acct: string; rec: string; resolved: boolean | null }[] {
  return [
    { label: 'Email', acct: m.account_email ?? '', rec: m.record_email ?? '', resolved: null },
    { label: 'GitHub', acct: handle(m.account_github), rec: handle(m.record_github), resolved: m.record_github ? !!m.record_github_resolved : null },
    { label: 'Discord', acct: handle(m.account_discord, true), rec: handle(m.record_discord, true), resolved: m.record_discord ? !!m.record_discord_resolved : null },
  ];
}
async function settle(m: Match, same: boolean) {
  busy.value = m.id;
  err.value = '';
  delete refused.value[m.id];
  const rec = m.person_name ?? props.personName ?? 'the record';
  const acct = m.account_name ?? 'the account';
  try {
    await linkPerson(m.id, same);
    msg.value = same ? `Linked: ${rec}'s record now has ${acct}'s account.` : `Kept apart: ${acct} and ${rec} are different people.`;
    emit('settled');
  } catch (e) {
    refused.value[m.id] = (e as Error).message;
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
        <table class="ev" data-evidence>
          <thead><tr><th></th><th>The account</th><th>The record</th></tr></thead>
          <tbody>
            <tr v-for="e in evidence(m)" :key="e.label" :data-ev="e.label.toLowerCase()">
              <th>{{ e.label }}</th>
              <td data-l="Account">{{ e.acct || '—' }}<span v-if="e.acct && e.label !== 'Email'" class="faint"> · signed in with</span></td>
              <td data-l="Record">{{ e.rec || '—' }}<span v-if="e.resolved !== null" :class="e.resolved ? 'ok' : 'faint'"> · {{ e.resolved ? 'resolved to an account' : 'typed, not resolved' }}</span></td>
            </tr>
            <tr data-ev="created"><th>Account made</th><td data-l="Account">{{ day(m.account_created_at) || '—' }}</td><td class="none"></td></tr>
          </tbody>
        </table>
        <p v-if="refused[m.id]" class="err" role="alert" data-refused>Not linked: {{ refused[m.id] }}</p>
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
.match { align-items: flex-start; }
.ev { width: 100%; margin-top: 8px; border-collapse: collapse; font-size: var(--text-sm); }
.ev th, .ev td { padding: 3px 8px 3px 0; text-align: left; vertical-align: top; overflow-wrap: break-word; }
.ev thead th { color: var(--fg-faint); font-weight: 500; }
.ev tbody th { width: 92px; color: var(--fg-muted); font-weight: 500; }
.ev .ok { color: var(--jade-11); }
.match .err { margin: 6px 0 0; }
.grow { flex: 1; min-width: 0; }
.btns { display: flex; gap: 6px; flex: none; }
.done { margin: 0; color: var(--jade-11); font-size: var(--text-base); }
.err { margin: 0; }
@media (max-width: 767px) {
  .match { flex-wrap: wrap; }
  .match .grow { flex-basis: 100%; }
  /* Phones: each line of evidence stacks, the account's side then the record's. */
  .ev thead { display: none; }
  .ev tr { display: block; padding: 4px 0; border-top: 1px solid var(--border-soft); }
  .ev tbody th, .ev td { display: block; width: auto; padding: 1px 0; overflow-wrap: break-word; }
  .ev td::before { content: attr(data-l) ': '; color: var(--fg-faint); }
  .ev td.none { display: none; }
}
</style>
