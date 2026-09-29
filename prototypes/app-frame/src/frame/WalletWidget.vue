<script setup lang="ts">
// Placeholder: shows where identity and balance live in the frame. No wallet logic.
</script>

<template>
  <button class="wallet" type="button" aria-label="Account and wallet">
    <span class="balance">0 ARROW</span>
    <span class="avatar" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
.wallet {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--fg);
  font: inherit;
  cursor: pointer;
}
.balance { font-family: var(--font-mono); font-size: var(--text-sm); }
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface-2);
}
</style>
