<template>
  <div class="target-layout">
    <div class="target-layout__map">
      <div class="demo-svgic" ref="containerRef" />
    </div>
    <div class="target-layout__panel" ref="panelRef">
      <div class="target-layout__hint">Click a room</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'

const containerRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()

const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A', description: 'Capacity: 12', floor: 1 },
  { id: 'room-102', title: 'Open Space',         description: 'Capacity: 30', floor: 1 },
  { id: 'room-103', title: 'Meeting Room B',     description: 'Capacity: 6',  floor: 1 },
  { id: 'room-201', title: 'Directors Office',   description: 'Capacity: 4',  floor: 2 },
  { id: 'room-202', title: 'Break Room',         description: 'Capacity: 10', floor: 2 },
  { id: 'room-203', title: 'Storage',            description: 'Capacity: —',  floor: 2 },
]

let client: Svgic | null = null

onMounted(async () => {
  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data,
    popup: {
      placement: 'target',
      target: panelRef.value!,
      trigger: 'click',
      render(item) {
        const el = document.createElement('div')
        el.className = 'target-popup'

        const title = document.createElement('div')
        title.className = 'target-popup__title'
        title.textContent = item.title ?? ''

        const desc = document.createElement('div')
        desc.className = 'target-popup__desc'
        desc.textContent = item.description ?? ''

        const floor = document.createElement('div')
        floor.className = 'target-popup__floor'
        floor.textContent = `Floor ${item.floor}`

        el.append(title, desc, floor)
        return el
      },
    },
    style: {
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
    },
  })
  await client.ready
})

onUnmounted(() => client?.destroy())
</script>

<style scoped>
.target-layout {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 12px;
  align-items: stretch;
}
.target-layout__map {
  min-width: 0;
}
.target-layout__map .demo-svgic {
  aspect-ratio: unset;
  height: 100%;
  min-height: 240px;
}
.target-layout__panel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.target-layout__hint {
  font-size: 13px;
  color: var(--vp-c-text-3);
  font-style: italic;
  text-align: center;
}
</style>
