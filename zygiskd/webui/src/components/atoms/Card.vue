<script setup lang="ts">
/* Card — the rounded panel (.card) with an optional uppercase title. */
defineProps<{ title?: string }>();
</script>

<template>
  <div class="card">
    <div v-if="title" class="card-title">{{ title }}</div>
    <slot />
  </div>
</template>
