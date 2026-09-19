<script setup lang="ts">
import { computed, ref } from 'vue';
import { q, openIssues, usd } from '../data/quiver';
import TaskRow from '../components/TaskRow.vue';
import Pretend from '../components/Pretend.vue';

const filter = ref<'all' | 'claimable' | 'attachments' | 'software' | 'market' | 'docs'>('all');
const tasks = computed(() => q.tasks.filter((t) => filter.value === 'all' || (filter.value === 'claimable' ? t.claimable && t.state === 'OPEN' : t.topics.includes(filter.value))));
const filters = ['all', 'claimable', 'attachments', 'software', 'market', 'docs'] as const;
const priced = q.tasks.reduce((a, t) => a + (t.priceUsd ?? 0), 0);
</script>

<template>
  <div class="spread">
    <div><h1>Work</h1><p class="lede">The Quiver task board as it stands: {{ q.tasks.length }} tasks, {{ usd(priced) }} priced, the rest priced at a milestone or the October checkpoint. Claiming a task means posting the unpaid sample.</p></div>
    <RouterLink to="/work/spec" class="btn">Write a new task together <Pretend /></RouterLink>
  </div>
  <div class="row" style="margin-bottom:12px"><button v-for="f in filters" :key="f" class="btn" :class="{ 'btn-ghost': filter !== f }" @click="filter = f">{{ f }}</button></div>
  <div class="tlist"><TaskRow v-for="t in tasks" :key="t.id" :task="t" /></div>

  <div class="section">
    <h2>Open issues off the board</h2>
    <a v-for="i in openIssues" :key="i.number" :href="i.url" target="_blank" rel="noopener" class="mini"><span class="mono muted">#{{ i.number }}</span> {{ i.title }} <span class="muted">· {{ i.comments }} comments</span></a>
  </div>
</template>
