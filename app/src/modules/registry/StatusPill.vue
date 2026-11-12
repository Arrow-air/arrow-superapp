<script setup lang="ts">
import { STATUS } from './community';
import type { OutreachStatus } from '../../lib/registry';

// Where the team is with someone: new, invited, call booked, talked, active,
// quiet, skipped. Team data: only core and leads' pages render it.
defineProps<{ status: OutreachStatus }>();
</script>

<template>
  <span class="pill" :class="STATUS[status][1]" data-status>{{ STATUS[status][0] }}</span>
</template>
