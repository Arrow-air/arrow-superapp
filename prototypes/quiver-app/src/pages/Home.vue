<script setup lang="ts">
import { computed } from 'vue';
import { q, openIssues, bomCostUsd, parts, usd } from '../data/quiver';
import { decisions, state, me } from '../data/pretend';
import TaskRow from '../components/TaskRow.vue';
import Pretend from '../components/Pretend.vue';

const open = q.tasks.filter((t) => t.state === 'OPEN');
const claimable = open.filter((t) => t.claimable);
const by = (topic: string) => open.filter((t) => t.topics.includes(topic));
const attach = by('attachments'), software = by('software'), market = open.filter((t) => t.topics.includes('market') || /sales|reliability/i.test(t.title));
const waiting = computed(() => decisions.filter((d) => !state.votes[d.id]));
const pricedOpen = open.reduce((a, t) => a + (t.priceUsd ?? 0), 0);
</script>

<template>
  <h1>Build on Quiver</h1>
  <p class="lede">The airframe is done. {{ parts.length }} parts, a {{ usd(bomCostUsd) }} bill of materials, three prototype generations behind it. What Quiver needs now is people building attachments and software on it, and people bringing it to market. This is the front door for that.</p>

  <div class="grid g3">
    <RouterLink to="/attachments" class="card door">
      <span class="label">Build an attachment</span>
      <span class="big">3 ports · ~13 W</span>
      <ul><li>Ethernet and CAN on every port, quick-release plate</li><li>{{ attach.length }} open tasks touch attachments</li><li>The power limit is an open decision</li></ul>
    </RouterLink>
    <RouterLink to="/attachments" class="card door">
      <span class="label">Build software</span>
      <span class="big">SDK · QuiverHub</span>
      <ul><li>Payload contract is a draft you can comment on</li><li>{{ software.length }} open tasks touch software</li><li>Developer guide, sections 1 to 3, readable here</li></ul>
    </RouterLink>
    <RouterLink to="/market" class="card door">
      <span class="label">Bring it to market</span>
      <span class="big">{{ usd(bomCostUsd) }} / unit</span>
      <ul><li>Cost rolled up from the live BOM</li><li>{{ market.length }} open tasks: sales page, reliability figures</li><li>Who can make which parts</li></ul>
    </RouterLink>
  </div>

  <div class="section grid g2">
    <div>
      <h2>Needs you <Pretend why="Which decisions count as yours depends on the persona you picked. Personas are invented." /></h2>
      <p class="muted small">As {{ me().label.toLowerCase() }}. {{ me().blurb }}.</p>
      <RouterLink v-for="d in waiting" :key="d.id" :to="`/decisions/${d.id}`" class="mini">
        <span class="chip" :class="d.kind === 'money' ? 'chip-bounty' : 'chip-project'">{{ d.kind }}</span>
        {{ d.title }} <span class="muted">· {{ d.source.label }}</span>
      </RouterLink>
      <p v-if="!waiting.length" class="empty">You have weighed in on every open decision.</p>
    </div>
    <div>
      <h2>Claimable now</h2>
      <p class="muted small">{{ claimable.length }} of {{ open.length }} open tasks. {{ usd(pricedOpen) }} priced across the open board.</p>
      <div class="tlist"><TaskRow v-for="t in claimable" :key="t.id" :task="t" /></div>
    </div>
  </div>

  <div class="section grid g4">
    <RouterLink to="/aircraft" class="stat door"><span class="n">{{ parts.length }}</span><span class="label">parts, each an anchor</span></RouterLink>
    <RouterLink to="/decisions" class="stat door"><span class="n">{{ decisions.length }} open · 0 written</span><span class="label">decisions in the register</span></RouterLink>
    <RouterLink to="/flights" class="stat door"><span class="n">{{ q.flights.length }}</span><span class="label">flight records in the repo</span></RouterLink>
    <RouterLink to="/work" class="stat door"><span class="n">{{ openIssues.length }}</span><span class="label">open issues off the board</span></RouterLink>
  </div>
</template>
