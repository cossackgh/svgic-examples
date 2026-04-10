<template>
  <div class="demo-controls">
    <span class="demo-controls__label">showOn:</span>
    <button
      v-for="m in modes" :key="m"
      :class="{ active: showOn === m }"
      @click="setMode(m)"
    >{{ m }}</button>
  </div>

  <div class="demo-svgic" ref="containerRef" />

  <div class="debug-note">
    Room <code>203</code> has no data entry — DebugPlugin will show a <strong>⚠ no data</strong> warning on it.
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import { DebugPlugin } from '@svgic/core/plugins/debug'
import type { SvgicItem } from '@svgic/core'

const containerRef = ref<HTMLElement>()
const modes = ['hover', 'click', 'both'] as const
type ShowOn = typeof modes[number]
const showOn = ref<ShowOn>('hover')

// room-203 intentionally missing to show ⚠ no data
const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A' },
  { id: 'room-102', title: 'Open Space'         },
  { id: 'room-103', title: 'Meeting Room B'     },
  { id: 'room-201', title: 'Directors Office'   },
  { id: 'room-202', title: 'Break Room'         },
]

let client: Svgic | null = null

async function init() {
  client?.destroy()
  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data,
    plugins: [
      DebugPlugin({ showOn: showOn.value }),
    ],
    style: {
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
    },
  })
  await client.ready
}

function setMode(m: ShowOn) {
  showOn.value = m
  init()
}

onMounted(init)
onUnmounted(() => client?.destroy())
</script>

<style scoped>
.demo-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.demo-controls__label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  font-family: var(--vp-font-family-mono);
}
.demo-controls button {
  padding: 4px 12px;
  border-radius: 5px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
  transition: all 0.15s;
}
.demo-controls button:hover { color: var(--vp-c-text-1); }
.demo-controls button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.debug-note {
  margin-top: 12px;
  padding: 8px 14px;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.debug-note code {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
}
.debug-note strong {
  color: #d97706;
}
</style>
