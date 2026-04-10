<template>
  <div class="demo-block">
    <div class="demo-block__preview">
      <slot />
    </div>
    <div v-if="label" class="demo-block__label">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label?: string
}>()
</script>
