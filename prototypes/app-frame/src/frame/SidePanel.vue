<script setup lang="ts">
defineEmits<{ close: [] }>();
</script>

<template>
  <aside class="panel" aria-label="Side panel">
    <div class="panel-head">
      <span>Panel</span>
      <button class="btn" type="button" @click="$emit('close')">Close</button>
    </div>
    <div class="panel-body">
      <p class="muted">Context for the page: discussion, details, activity.</p>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  position: sticky;
  top: var(--bar-height);
  height: calc(100dvh - var(--bar-height));
  overflow-y: auto;
  background: var(--surface);
  border-left: 1px solid var(--border);
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
}
.panel-body { padding: var(--space-4); }

/* Below tablet width the panel becomes a bottom sheet over the content. */
@media (max-width: 767px) {
  .panel {
    position: fixed;
    inset: auto 0 var(--mobile-nav-height) 0;
    top: auto;
    height: 60dvh;
    z-index: 20;
    border-left: none;
    border-top: 1px solid var(--border);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: var(--shadow-lg);
  }
}
</style>
