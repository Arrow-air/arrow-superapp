<script setup lang="ts">
import { computed, ref } from 'vue';
import DiscussPin from '../components/DiscussPin.vue';
import WeightBox from '../components/WeightBox.vue';
import { state } from '../data/store';
import { tokens as fmtTokens } from '../lib/format';
import type { Member, Thread, Role } from '../lib/types';
import { DEFAULT_WEIGHTS, tokenTerm, voteWeight } from '../lib/weights';

// Try-it calculator. Same voteWeight() the threads use, so what you see here is what you get there.
const calcProject = ref('');
const calcTokens = ref(10_000);
const calcRole = ref<Role>('member');
const calcExpert = ref(false);
const calcBuilder = ref(false);
const cfg = computed(() => state.projects.find((p) => p.id === calcProject.value)?.weights ?? state.projects[0]?.weights ?? DEFAULT_WEIGHTS);
const presets = [0, 1_000, 10_000, 100_000, 1_000_000];

const calc = computed(() => {
  const thread = { id: '', projectId: '', title: '', body: '', tags: ['subject'], authorId: '', status: 'open', createdAt: '' } as Thread;
  const member = { id: 'x', handle: 'x', displayName: 'x', tokenBalance: Number(calcTokens.value) || 0, expertise: calcExpert.value ? ['subject'] : [] } as Member;
  return voteWeight({ member, thread, role: calcRole.value, isBuilder: calcBuilder.value, cfg: cfg.value });
});
</script>

<template>
  <h1>How weighting works</h1>
  <div class="stack" style="max-width: 780px">
    <p>
      On the 2026-09-17 call we agreed votes on design decisions should not be one person one vote. Otherwise strangers, or
      their agents, post takes they have no business posting. We named four things that should make a voice count for more.
      Each one is a term in the formula.
    </p>

    <div class="weight-box">
      <div class="weight-formula" style="font-size: 0.95rem; margin: 0">
        weight = (base + tokens + expertise + builder) × role
      </div>
    </div>

    <section class="calc">
      <h2 style="margin-top: 0">Try it</h2>
      <div class="calc-grid">
        <div class="stack">
          <label class="field-row">
            <span class="label">$ARROW held</span>
            <input v-model.number="calcTokens" type="number" min="0" step="1000" />
            <div class="row" style="gap: 6px; margin-top: 6px">
              <button v-for="n in presets" :key="n" type="button" class="chip chip-btn" :class="{ 'chip-on': calcTokens === n }" @click="calcTokens = n">
                {{ n >= 1_000_000 ? '1M' : n >= 1000 ? n / 1000 + 'k' : n }}
              </button>
            </div>
          </label>
          <label class="field-row">
            <span class="label">Role on this project</span>
            <select v-model="calcRole" class="field">
              <option value="member">member</option>
              <option value="core">core contributor</option>
              <option value="lead">project lead</option>
            </select>
          </label>
          <label class="row" style="cursor: pointer"><input v-model="calcExpert" type="checkbox" /> Expertise matches the thread's subject</label>
          <label class="row" style="cursor: pointer"><input v-model="calcBuilder" type="checkbox" /> Declared intent to build or operate it</label>
        </div>
        <div class="stack">
          <WeightBox :breakdown="calc" title="This person's vote counts" pin="formula" />
          <table class="data">
            <thead><tr><th class="num">$ARROW held</th><th class="num">Token term</th></tr></thead>
            <tbody>
              <tr v-for="n in presets" :key="n" :class="{ 'row-on': calcTokens === n }">
                <td class="num">{{ fmtTokens(n) }}</td><td class="num">{{ tokenTerm(n, cfg) }}</td>
              </tr>
            </tbody>
          </table>
          <div class="hint"><DiscussPin anchor="token-curve" class="pin-right" />A thousand times the tokens buys about ten times the term, then it caps. That curve is the whole argument about whales.</div>
        </div>
      </div>
    </section>

    <table class="data">
      <thead><tr><th>Term</th><th>What it rewards</th><th>How it is computed</th></tr></thead>
      <tbody>
        <tr><td><b>base</b></td><td>Showing up</td><td>Everyone starts with it.</td></tr>
        <tr>
          <td><b>tokens</b></td><td>Skin in the game</td>
          <td>Logarithmic in $ARROW held, and capped. A holder with 100 times the tokens gets about 3 times the term, not 100 times. Whales count for more, never for everything.</td>
        </tr>
        <tr><td><b>expertise</b></td><td>Knowing the subject</td><td><DiscussPin anchor="expertise" class="pin-right" />Flat bonus if any of your expertise tags matches any tag on the thread. One match or five, same bonus.</td></tr>
        <tr><td><b>builder</b></td><td>Living with the result</td><td><DiscussPin anchor="builder-intent" class="pin-right" />Flat bonus if you publicly declare you intend to build or operate the thing. Per thread.</td></tr>
        <tr><td><b>role</b></td><td>Accountability</td><td><DiscussPin anchor="role-multiplier" class="pin-right" />A multiplier: project lead, core contributor, or member. Set per project, so a Quiver lead is an ordinary member on Spearhead.</td></tr>
      </tbody>
    </table>

    <section>
      <h2>Current values</h2>
      <div class="table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th>Project</th><th class="num">base</th><th class="num">token cap</th><th class="num">token scale</th>
              <th class="num">expertise</th><th class="num">builder</th><th class="num">lead ×</th><th class="num">core ×</th><th class="num">member ×</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in state.projects" :key="p.id">
              <td>{{ p.name }}</td>
              <td class="num">{{ p.weights.base }}</td>
              <td class="num">{{ p.weights.tokenCap }}</td>
              <td class="num">{{ p.weights.tokenScale.toLocaleString('en-US') }}</td>
              <td class="num">{{ p.weights.expertiseBonus }}</td>
              <td class="num">{{ p.weights.builderBonus }}</td>
              <td class="num">{{ p.weights.roleMultiplier.lead }}</td>
              <td class="num">{{ p.weights.roleMultiplier.core }}</td>
              <td class="num">{{ p.weights.roleMultiplier.member }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="small muted">Every one of these numbers is a guess. They are per project so a project can tune them. The readout page shows what they do in practice.</p>
    </section>

    <section>
      <h2>The lead keeps the final say <DiscussPin anchor="lead-override" class="pin-inline" /></h2>
      <p>
        Aircraft are trade-offs and someone has to be opinionated. Only the project lead can promote a position to a bounty, and the lead
        may promote any position. If it is not the top weighted position, the lead has to write down why, and that reasoning is published on the bounty.
        The community gets a voice and an explanation. The lead keeps authority.
      </p>
    </section>

    <section>
      <h2>What this does not do yet</h2>
      <ul>
        <li><b>Token balances are self-reported.</b> A real version reads them from a linked wallet. Until then the token term runs on trust.</li>
        <li><b>Expertise tags are self-declared.</b> Nothing checks them. Reputation from shipped work is a separate idea in the repo.</li>
        <li><b>No rewards move.</b> The bounty text has placeholders for the position retro grant and the build bounty. Paying out is a later experiment.</li>
        <li><b>No agents.</b> Agent delegates and pre-meeting briefs are a separate experiment.</li>
      </ul>
    </section>
  </div>
</template>
