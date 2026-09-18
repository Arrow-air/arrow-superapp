<script setup lang="ts">
import { state } from '../data/store';
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

    <table class="data">
      <thead><tr><th>Term</th><th>What it rewards</th><th>How it is computed</th></tr></thead>
      <tbody>
        <tr><td><b>base</b></td><td>Showing up</td><td>Everyone starts with it.</td></tr>
        <tr>
          <td><b>tokens</b></td><td>Skin in the game</td>
          <td>Logarithmic in $ARROW held, and capped. A holder with 100 times the tokens gets about 3 times the term, not 100 times. Whales count for more, never for everything.</td>
        </tr>
        <tr><td><b>expertise</b></td><td>Knowing the subject</td><td>Flat bonus if any of your expertise tags matches any tag on the need. One match or five, same bonus.</td></tr>
        <tr><td><b>builder</b></td><td>Living with the result</td><td>Flat bonus if you publicly declare you intend to build or operate the thing. Per need.</td></tr>
        <tr><td><b>role</b></td><td>Accountability</td><td>A multiplier: project lead, core contributor, or member. Set per project, so a Quiver lead is an ordinary member on Spearhead.</td></tr>
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
      <h2>The lead keeps the final say</h2>
      <p>
        Aircraft are trade-offs and someone has to be opinionated. Only the project lead can promote a spec to a bounty, and the lead
        may promote any spec. If it is not the top weighted spec, the lead has to write down why, and that reasoning is published on the bounty.
        The community gets a voice and an explanation. The lead keeps authority.
      </p>
    </section>

    <section>
      <h2>What this does not do yet</h2>
      <ul>
        <li><b>Token balances are self-reported.</b> A real version reads them from a linked wallet. Until then the token term runs on trust.</li>
        <li><b>Expertise tags are self-declared.</b> Nothing checks them. Reputation from shipped work is a separate idea in the repo.</li>
        <li><b>No rewards move.</b> The bounty text has placeholders for the spec retro grant and the build bounty. Paying out is a later experiment.</li>
        <li><b>No agents.</b> Agent delegates and pre-meeting briefs are a separate experiment.</li>
      </ul>
    </section>
  </div>
</template>
