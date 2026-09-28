<script setup lang="ts">
import type { WorkInput } from '../lib/types';
import { DEFAULT_PROPOSER_SHARE } from '../lib/grant';
const work = defineModel<WorkInput>({ required: true });
const amount = (value: string) => { work.value.amount = value === '' ? undefined : Math.max(0, Math.floor(Number(value))); };
</script>
<template>
  <div class="work-fields stack">
    <div class="work-type-row">
      <label class="field-row"><span class="label">Work format</span><select v-model="work.kind" aria-label="Work format"><option value="grant">Grant</option><option value="bounty">Bounty</option></select></label>
      <label class="field-row"><span class="label">Purpose</span><select v-model="work.purpose" aria-label="Work purpose"><option value="implementation">Build / implement</option><option value="research">Research / investigate</option></select></label>
      <label class="field-row"><span class="label">Reward ($ARROW)</span><input type="number" min="0" step="100" :value="work.amount ?? ''" aria-label="Reward in ARROW" placeholder="e.g. 4000" @input="amount(($event.target as HTMLInputElement).value)" /></label>
    </div>
    <p class="small muted">{{ work.purpose === 'research' ? 'Pay for an answer, an experiment, or a comparison. This does not adopt a design.' : 'A bounded piece of work with a clear result, separate from the design decision.' }} It starts as a draft; open it when the scope is ready. {{ Math.round(DEFAULT_PROPOSER_SHARE * 100) }}% of the reward goes to whoever raised the idea.</p>
    <label class="field-row"><span class="label">Work title</span><input v-model="work.title" aria-label="Work title" placeholder="What should someone deliver?" /></label>
    <label class="field-row"><span class="label">Scope and deliverables</span><textarea v-model="work.scope" aria-label="Work scope" placeholder="Describe the work, boundaries, and deliverables." /></label>
    <label class="field-row"><span class="label">Acceptance criteria</span><textarea v-model="work.acceptance" aria-label="Work acceptance criteria" placeholder="What evidence will demonstrate that this work is complete?" /></label>
  </div>
</template>
