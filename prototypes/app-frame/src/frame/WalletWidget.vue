<script setup lang="ts">
// Placeholder: shows where identity and balance live in the frame. No wallet logic.
defineProps<{ balance: number }>();
</script>

<template>
  <button class="wallet" type="button" aria-label="Account and wallet">
    <span class="balance">{{ balance.toLocaleString('en-US') }} ARROW</span>
    <span class="avatar" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
.wallet {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: var(--control-height);
  padding: 0 0 0 var(--space-3);
  border: 1px solid var(--border-soft);
  border-left: 0;
  border-radius: 0 999px 999px 0;
  background: var(--surface-sunken);
  cursor: pointer;
}
.balance {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: #717171;
  letter-spacing: 0.02em;
}
.avatar {
  width: 36px;
  height: 36px;
  margin: -1px -1px -1px 0;
  border-radius: 50%;
  background: var(--avatar);
}
@media (max-width: 767px) {
  .balance { display: none; }
  .wallet { padding: 0; border: 0; background: none; }
}
</style>
