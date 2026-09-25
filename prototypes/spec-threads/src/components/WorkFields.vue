<script setup lang="ts">
import type { WorkInput } from '../lib/types';
const work = defineModel<WorkInput>({ required: true });
</script>
<template>
  <div class="work-fields stack">
    <div class="work-type-row">
      <label class="field-row"><span class="label">Work format</span><select v-model="work.kind" aria-label="Work format"><option value="grant">Grant</option><option value="bounty">Bounty</option></select></label>
      <label class="field-row"><span class="label">Purpose</span><select v-model="work.purpose" aria-label="Work purpose"><option value="implementation">Build / implement</option><option value="research">Research / investigate</option></select></label>
    </div>
    <p class="small muted">{{ work.purpose === 'research' ? 'Commission an answer, experiment, or comparison. This does not adopt a design.' : 'Define a bounded piece of work, independently of the design decision.' }} Both formats remain drafts; nothing is funded or assigned here.</p>
    <label class="field-row"><span class="label">Work title</span><input v-model="work.title" aria-label="Work title" placeholder="What should someone deliver?" /></label>
    <label class="field-row"><span class="label">Scope and deliverables</span><textarea v-model="work.scope" aria-label="Work scope" placeholder="Describe the work, boundaries, and deliverables." /></label>
    <label class="field-row"><span class="label">Acceptance criteria</span><textarea v-model="work.acceptance" aria-label="Work acceptance criteria" placeholder="What evidence will demonstrate that this work is complete?" /></label>
  </div>
</template>
