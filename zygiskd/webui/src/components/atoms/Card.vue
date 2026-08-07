<script setup lang="ts">
/* Card — the bordered panel (.card) with an optional uppercase .card-title. */
defineProps<{ title?: string }>();
</script>

<template>
  <div class="card">
    <div v-if="title" class="card-title">{{ title }}</div>
    <slot />
  </div>
</template>
