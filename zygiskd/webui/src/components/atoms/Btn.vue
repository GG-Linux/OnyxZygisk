<script setup lang="ts">
/* Btn — action button (.btn / .btn-primary / .btn-danger / .btn-sm). */
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "primary" | "danger";
    size?: "default" | "sm";
  }>(),
  { variant: "default", size: "default" },
);

const classes = computed(() => {
  const list = ["btn"];
  if (props.variant === "primary") list.push("btn-primary");
  if (props.variant === "danger") list.push("btn-danger");
  if (props.size === "sm") list.push("btn-sm");
  return list;
});
</script>

<template>
  <button :class="classes"><slot /></button>
</template>
