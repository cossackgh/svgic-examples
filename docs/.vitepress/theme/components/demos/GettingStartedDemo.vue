<template>
  <div class="demo-svgic" ref="containerRef" />
  <div v-if="selected" class="demo-info">
    <strong>{{ selected.title }}</strong>
    <span>{{ selected.description }}</span>
  </div>
  <div v-else class="demo-info demo-info--hint">
    Click a room
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'

const containerRef = ref<HTMLElement>()
const selected = ref<SvgicItem | null>(null)

const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A', description: 'Capacity: 12' },
  { id: 'room-102', title: 'Open Space',         description: 'Capacity: 30' },
  { id: 'room-103', title: 'Meeting Room B',     description: 'Capacity: 6'  },
  { id: 'room-201', title: 'Directors Office',   description: 'Capacity: 4'  },
  { id: 'room-202', title: 'Break Room',         description: 'Capacity: 10' },
  { id: 'room-203', title: 'Storage',            description: 'Capacity: —'  },
]

let client: Svgic | null = null

onMounted(async () => {
  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: {
      rooms: { role: 'interactive' },
    },
    data,
    style: {
      default:  { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:    { fill: '#4a4a80' },
    },
  })

  await client.ready

  client.on('click', (_id, item) => {
    selected.value = item
  })
})

onUnmounted(() => {
  client?.destroy()
})
</script>

<style scoped>
.demo-info {
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  display: flex;
  gap: 12px;
  align-items: baseline;
  font-size: 14px;
}
.demo-info strong {
  color: var(--vp-c-text-1);
}
.demo-info span {
  color: var(--vp-c-text-2);
}
.demo-info--hint {
  color: var(--vp-c-text-3);
  font-style: italic;
}
</style>
