<template>
  <div class="zoom-hint">
    <span>🖱 Ctrl + scroll to zoom &nbsp;·&nbsp; drag to pan</span>
    <span class="zoom-hint__scale">{{ scaleLabel }}</span>
  </div>

  <div class="demo-svgic" ref="containerRef" />

  <div class="zoom-controls">
    <div class="zoom-controls__group">
      <span class="zoom-controls__label">Zoom</span>
      <button @click="zoom?.zoomTo(1.5)">1.5×</button>
      <button @click="zoom?.zoomTo(3)">3×</button>
      <button @click="zoom?.zoomTo(6)">6×</button>
      <button @click="zoom?.reset()">Reset</button>
    </div>
    <div class="zoom-controls__group">
      <span class="zoom-controls__label">Focus room</span>
      <button v-for="r in rooms" :key="r.id" @click="zoom?.focusElement(r.id, { scale: 3 })">
        {{ r.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'
import type { SvgicItem } from '@svgic/core'

const containerRef = ref<HTMLElement>()
const scaleLabel = ref('1×')

const rooms = [
  { id: 'room-101', label: '101' },
  { id: 'room-102', label: '102' },
  { id: 'room-103', label: '103' },
  { id: 'room-201', label: '201' },
  { id: 'room-202', label: '202' },
  { id: 'room-203', label: '203' },
]

const data: SvgicItem[] = rooms.map(r => ({ id: r.id, title: `Room ${r.label}` }))

let zoom: ReturnType<typeof ZoomPlugin> | null = null
let client: Svgic | null = null

onMounted(async () => {
  zoom = ZoomPlugin({
    wheelMode: 'ctrl',
    minScale: 0.5,
    maxScale: 8,
    animate: true,
  })

  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data,
    plugins: [zoom],
    popup: { placement: 'cursor' },
    style: {
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
    },
  })

  await client.ready

  // Track current scale
  const updateScale = () => {
    const state = zoom?.getState()
    if (state) scaleLabel.value = `${state.scale.toFixed(2)}×`
  }

  containerRef.value!.addEventListener('wheel', updateScale, { passive: true })
  containerRef.value!.addEventListener('pointerup', updateScale)
  containerRef.value!.addEventListener('click', updateScale)
})

onUnmounted(() => client?.destroy())
</script>

<style scoped>
.zoom-hint {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-bottom: 8px;
}
.zoom-hint__scale {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
}
.zoom-controls {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.zoom-controls__group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.zoom-controls__label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-right: 2px;
}
.zoom-controls__group button {
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
.zoom-controls__group button:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
}
</style>
