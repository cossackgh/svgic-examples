<template>
  <div class="demo-controls">
    <span class="demo-controls__label">Anchor:</span>
    <button
      v-for="a in anchors" :key="a"
      :class="{ active: anchor === a }"
      @click="setAnchor(a)"
    >{{ a }}</button>
  </div>

  <div class="demo-svgic" ref="containerRef" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'

const containerRef = ref<HTMLElement>()

const anchors = [
  'top-center', 'top-left', 'top-right',
  'bottom-center', 'left', 'right', 'center',
] as const

type Anchor = typeof anchors[number]

const anchor = ref<Anchor>('top-center')

const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A', description: 'Capacity: 12' },
  { id: 'room-102', title: 'Open Space',         description: 'Capacity: 30' },
  { id: 'room-103', title: 'Meeting Room B',     description: 'Capacity: 6'  },
  { id: 'room-201', title: 'Directors Office',   description: 'Capacity: 4'  },
  { id: 'room-202', title: 'Break Room',         description: 'Capacity: 10' },
  { id: 'room-203', title: 'Storage',            description: 'Capacity: —'  },
]

let client: Svgic | null = null

async function init() {
  client?.destroy()
  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data,
    popup: {
      placement: 'element',
      anchor: anchor.value,
      offset: { x: 0, y: -8 },
      flip: true,
    },
    style: {
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
    },
  })
  await client.ready
}

function setAnchor(a: Anchor) {
  anchor.value = a
  init()
}

onMounted(init)
onUnmounted(() => client?.destroy())
</script>

<style scoped>
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}
.demo-controls__label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-right: 2px;
}
.demo-controls button {
  padding: 4px 10px;
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
</style>
