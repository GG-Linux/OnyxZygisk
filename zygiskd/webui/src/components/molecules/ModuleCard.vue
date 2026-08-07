<script setup lang="ts">
/* ModuleCard — the shared module/FN node card (.mod-card).
 *
 * Used by both the Modules section (tags only) and the FN section (tags +
 * a right-side toggle via the #extra slot).
 */
defineProps<{
  name: string;
  meta?: string;
  desc?: string;
}>();
</script>

<template>
  <div class="mod-card">
    <div class="mod-body">
      <div class="mod-name">{{ name }}</div>
      <div v-if="meta" class="mod-meta">{{ meta }}</div>
      <div v-if="desc" class="mod-desc">{{ desc }}</div>
      <div v-if="$slots.tags" class="mod-tags"><slot name="tags" /></div>
    </div>
    <slot name="extra" />
  </div>
</template>
