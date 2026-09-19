<script setup lang="ts">
import { personas, state, resetDemo } from './data/pretend';
import { q } from './data/quiver';
const built = new Date(q.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
</script>

<template>
  <header class="nav">
    <div class="nav-inner">
      <RouterLink to="/" class="brand"><span class="brand-mark">QUIVER</span><span class="brand-sub">one app for one aircraft</span></RouterLink>
      <nav class="nav-links">
        <RouterLink to="/aircraft">Aircraft</RouterLink>
        <RouterLink to="/attachments">Attachments &amp; software</RouterLink>
        <RouterLink to="/decisions">Decisions</RouterLink>
        <RouterLink to="/work">Work</RouterLink>
        <RouterLink to="/money">Money</RouterLink>
        <RouterLink to="/flights">Flights</RouterLink>
        <RouterLink to="/guides">Guides</RouterLink>
        <RouterLink to="/market">Market</RouterLink>
      </nav>
      <label class="persona"><span>Viewing as</span>
        <select v-model="state.persona"><option v-for="p in personas" :key="p.id" :value="p.id">{{ p.label }}</option></select>
      </label>
    </div>
  </header>
  <div class="demo-strip">
    <span><strong>Concept demo.</strong> Parts, tasks, prices, issues and guides are real and read-only, pulled from the Quiver repo on {{ built }}. Anything marked <span class="chip chip-pretend">pretend</span> is invented so the screen can be clicked. Nothing here writes to GitHub.</span>
    <button class="link-btn" @click="resetDemo">Reset my clicks</button>
  </div>
  <main class="page"><RouterView /></main>
  <footer class="foot">Source: <a :href="q.sources.repo" target="_blank" rel="noopener">Arrow-air/project-quiver</a> · {{ q.sources.bomTitle }}, {{ q.sources.bomDate }} · personas are roles, not people</footer>
</template>
