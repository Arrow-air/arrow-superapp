<script setup lang="ts">
import { q, openIssues } from '../data/quiver';
import { decisionById } from '../data/pretend';
import { md } from '../lib/markdown';
import TaskRow from '../components/TaskRow.vue';
import Real from '../components/Real.vue';

const open = q.tasks.filter((t) => t.state === 'OPEN');
const attach = open.filter((t) => t.topics.includes('attachments'));
const software = open.filter((t) => t.topics.includes('software') && !t.topics.includes('attachments'));
const field = [...q.tasks, ...q.issues].filter((x) => /multispectral|latch|dispenser|spreader|RAM ball/i.test(x.title));
const power = decisionById.get('attach-power')!;
const issues = openIssues.filter((i) => i.topics.includes('attachments'));
</script>

<template>
  <h1>Attachments &amp; software</h1>
  <p class="lede">What you can plug into, what the limits are, what is being paid for, and what others have already built on the interface.</p>

  <div class="grid g2">
    <div class="card">
      <div class="spread"><h2>The interface</h2><Real :href="q.attachmentSpec.url" :label="`PAYLOAD_SPEC.md · ${q.attachmentSpec.status}`" /></div>
      <div class="prose" v-html="md(q.attachmentSpec.purpose ?? '')" />
    </div>
    <div class="stack">
      <RouterLink :to="`/decisions/${power.id}`" class="card door" style="border-top-color:var(--status-warning)">
        <span class="label">Open decision that limits what you can build</span>
        <h3>{{ power.title }}</h3>
        <span class="small muted">{{ power.question }}</span>
      </RouterLink>
      <div class="card card-subtle">
        <h3>Start here</h3>
        <a class="mini" href="https://github.com/Arrow-air/quiver-sdk" target="_blank" rel="noopener">quiver-sdk ↗ <span class="muted">architecture and payload contract</span></a>
        <a class="mini" href="https://github.com/Pan-Robotics/quiver-payload-template" target="_blank" rel="noopener">quiver-payload-template ↗ <span class="muted">reference implementation</span></a>
        <RouterLink class="mini" to="/guides">Developer guide <span class="muted">read and comment on a sentence</span></RouterLink>
        <RouterLink class="mini" to="/aircraft/3331">3331 Attachment Interface PCB <span class="muted">on the aircraft</span></RouterLink>
      </div>
    </div>
  </div>

  <div class="section grid g2">
    <div><h2>Paid work: attachments</h2><div class="tlist"><TaskRow v-for="t in attach" :key="t.id" :task="t" /></div></div>
    <div><h2>Paid work: software</h2><div class="tlist"><TaskRow v-for="t in software" :key="t.id" :task="t" /></div></div>
  </div>

  <div class="section">
    <h2>Built on the interface so far</h2>
    <p class="muted small">Every task or issue whose title names an attachment. A real catalog would add photos, files and where each one flies.</p>
    <table class="t"><thead><tr><th>Ref</th><th>What</th><th>State</th></tr></thead>
      <tbody><tr v-for="x in field" :key="x.number"><td class="mono">#{{ x.number }}</td><td><a :href="x.url" target="_blank" rel="noopener">{{ x.title }}</a></td><td>{{ x.state.toLowerCase() }}</td></tr></tbody></table>
    <p v-if="issues.length" class="small muted" style="margin-top:10px">Open issues on attachments: <a v-for="i in issues" :key="i.number" :href="i.url" target="_blank" rel="noopener" style="margin-right:10px">#{{ i.number }}</a></p>
  </div>
</template>
