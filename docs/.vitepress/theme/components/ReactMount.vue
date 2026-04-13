<template>
  <div ref="mountRef" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import type { ComponentType } from 'react'

const props = defineProps<{
  component: ComponentType
  componentProps?: Record<string, unknown>
}>()

const mountRef = ref<HTMLElement>()
let root: Root | null = null

onMounted(() => {
  root = createRoot(mountRef.value!)
  root.render(createElement(props.component, props.componentProps ?? {}))
})

onUnmounted(() => {
  root?.unmount()
  root = null
})
</script>
