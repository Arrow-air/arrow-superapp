<script setup lang="ts">
import { computed, ref } from 'vue';
import Avatar from '../threads/Avatar.vue';
import SourceChip from '../threads/SourceChip.vue';
import { acceptWork, awardOf, claimWork, confirmProposer, day, person, publishWork, requestChanges, state, submitWork, type Work } from '../threads/store';

// A bounty or grant drafted from a decision: what it is, what it pays, who
// gets the proposer award, and the one next step for whoever is looking.
const props = defineProps<{ work: Work }>();
const w = computed(() => props.work);
const isLead = computed(() => state.role === 'lead');
const nameOf = (id?: string) => (id === 'me' ? 'You' : person(id)?.name);
const stageLabel: Record<Work['stage'], string> = { draft: 'Draft', open: 'Open', in_progress: 'In progress', in_review: 'In review', completed: 'Accepted', withdrawn: 'Withdrawn' };
const kindLabel = computed(() => (w.value.kind === 'bounty' ? 'Bounty' : 'Grant'));
const evidence = ref('');
const changes = ref('');
const showHistory = ref(false);
</script>

<template>
  <div class="wc" :data-stage="w.stage">
    <div class="wc-head">
      <span class="mono">{{ w.id }}</span>
      <span class="kind">{{ kindLabel }}</span>
      <span class="stage" :data-stage="w.stage">{{ stageLabel[w.stage] }}</span>
      <span class="reward"><b>{{ w.reward.toLocaleString('en-US') }}</b> ARROW</span>
    </div>
    <p class="title">{{ w.title }}</p>
    <p class="award">
      Proposer award {{ Math.round(w.proposerShare * 100) }}%: <b>{{ awardOf(w).toLocaleString('en-US') }} ARROW</b>
      <template v-if="w.proposer.personId && w.proposer.confirmedBy">
        to <Avatar :id="w.proposer.personId" :size="14" /> {{ nameOf(w.proposer.personId) }}<template v-if="w.proposer.personId !== 'me'">, confirmed by {{ nameOf(w.proposer.confirmedBy) }}</template>
      </template>
      <template v-else-if="w.proposer.personId">
        to <Avatar :id="w.proposer.personId" :size="14" /> {{ nameOf(w.proposer.personId) }}, named in the notes. Held until a lead confirms who raised it.
        <button v-if="isLead" class="link" type="button" @click="confirmProposer(w)">Confirm</button>
      </template>
      <template v-else>
        held: the idea came from <SourceChip v-if="w.proposer.source" :source="w.proposer.source" />, with no person named. A lead names who raised it before it is paid.
      </template>
    </p>
    <details class="scope">
      <summary>Scope and acceptance</summary>
      <p class="pre">{{ w.scope }}</p>
      <p class="lab">Accepted when</p>
      <p class="pre">{{ w.acceptance }}</p>
    </details>
    <p v-if="w.ownerId" class="owner"><Avatar :id="w.ownerId" :size="14" /> {{ nameOf(w.ownerId) }} took it on<template v-if="w.evidence"> · evidence: {{ w.evidence }}</template></p>

    <div class="next">
      <template v-if="w.stage === 'draft'">
        <button v-if="isLead" class="primary" type="button" @click="publishWork(w)">Publish {{ kindLabel.toLowerCase() }}</button>
        <span v-else class="muted">Draft. A lead publishes it.</span>
      </template>
      <template v-else-if="w.stage === 'open'">
        <button class="primary" type="button" @click="claimWork(w)">{{ w.kind === 'bounty' ? 'Claim this bounty' : 'Take on this grant' }}</button>
      </template>
      <template v-else-if="w.stage === 'in_progress'">
        <form v-if="w.ownerId === 'me'" class="row" @submit.prevent="submitWork(w, evidence.trim()); evidence = ''">
          <input v-model="evidence" class="field" placeholder="Evidence: PR, log, photos" aria-label="Evidence" />
          <button class="primary" type="submit" :disabled="!evidence.trim()">Submit for review</button>
        </form>
        <span v-else class="muted">In progress.</span>
      </template>
      <template v-else-if="w.stage === 'in_review'">
        <div v-if="isLead" class="row">
          <button class="primary" type="button" @click="acceptWork(w)">Accept</button>
          <input v-model="changes" class="field" placeholder="Or: what needs to change" aria-label="Changes requested" />
          <button class="secondary" type="button" :disabled="!changes.trim()" @click="requestChanges(w, changes.trim()); changes = ''">Request changes</button>
        </div>
        <span v-else class="muted">Waiting for the lead's review.</span>
      </template>
      <span v-else class="muted">Accepted. Nothing is paid from the app; payouts follow the DAO's process.</span>
    </div>

    <button class="hist-t" type="button" @click="showHistory = !showHistory">{{ showHistory ? 'Hide history' : `History (${w.history.length})` }}</button>
    <ul v-if="showHistory" class="hist">
      <li v-for="(h, i) in w.history" :key="i"><span class="muted">{{ day(h.at) }}</span> {{ h.note }}<span class="muted"> · {{ nameOf(h.byId) }}</span></li>
    </ul>
  </div>
</template>

<style scoped>
.wc { padding: 12px 14px; border: 1px solid var(--slate-a5); border-radius: 12px; background: var(--slate-a2); }
.wc-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: var(--text-sm); }
.mono { font-family: var(--font-mono); color: var(--fg-muted); }
.kind { color: var(--fg-2); font-weight: 500; }
.stage { height: 18px; padding: 0 6px; border-radius: 5px; background: var(--slate-a3); color: var(--fg-muted); line-height: 18px; font-weight: 500; }
.stage[data-stage='open'] { background: var(--indigo-a3); color: var(--indigo-11); }
.stage[data-stage='in_progress'], .stage[data-stage='in_review'] { background: var(--amber-a3); color: var(--amber-11); }
.stage[data-stage='completed'] { background: var(--jade-a3); color: var(--jade-11); }
.wc[data-stage='withdrawn'] { opacity: 0.6; }
.reward { margin-left: auto; color: var(--fg-muted); }
.reward b { color: var(--fg); font-weight: 600; }
.title { margin: 8px 0 0; color: var(--fg); font-size: var(--text-nav); font-weight: 500; line-height: 1.45; }
.award { margin: 6px 0 0; font-size: var(--text-sm); color: var(--fg-muted); line-height: 1.7; }
.award :deep(.av) { vertical-align: -3px; margin: 0 2px; }
.award b { color: var(--fg-2); font-weight: 500; }
.scope { margin-top: 8px; font-size: var(--text-sm); }
.scope summary { color: var(--fg-muted); cursor: pointer; }
.pre { margin: 6px 0 0; white-space: pre-wrap; color: var(--fg-2); font-size: var(--text-base); line-height: 1.5; }
.lab { margin: 8px 0 0; color: var(--fg-faint); }
.owner { display: flex; align-items: center; gap: 5px; margin: 8px 0 0; font-size: var(--text-sm); color: var(--fg-2); }
.next { margin-top: 10px; }
.row { display: flex; flex-wrap: wrap; gap: 6px; }
.field { flex: 1; min-width: 160px; height: 30px; padding: 0 10px; border: 1px solid var(--slate-a4); border-radius: 8px; background: var(--slate-a2); color: var(--fg); font: inherit; font-size: var(--text-base); outline: none; }
.primary { height: 30px; padding: 0 12px; border: 0; border-radius: 8px; background: var(--indigo-9); color: #fff; font: inherit; font-size: var(--text-base); font-weight: 500; cursor: pointer; }
.primary:disabled { opacity: 0.4; cursor: default; }
.secondary { height: 30px; padding: 0 12px; border: 1px solid var(--slate-a5); border-radius: 8px; background: none; color: var(--fg-2); font: inherit; font-size: var(--text-base); cursor: pointer; }
.secondary:disabled { opacity: 0.4; cursor: default; }
.muted { color: var(--fg-muted); font-size: var(--text-sm); }
.link { padding: 0; border: 0; background: none; color: var(--indigo-11); font: inherit; cursor: pointer; }
.link:hover { text-decoration: underline; }
.hist-t { margin-top: 10px; padding: 0; border: 0; background: none; color: var(--fg-faint); font: inherit; font-size: var(--text-sm); cursor: pointer; }
.hist { margin: 4px 0 0; padding-left: 16px; font-size: var(--text-sm); color: var(--fg-2); line-height: 1.6; }
</style>
