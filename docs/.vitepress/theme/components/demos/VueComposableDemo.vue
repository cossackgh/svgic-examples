<template>
  <div class="demo-layout">
    <div ref="containerRef" class="demo-svgic" />

    <div class="demo-controls">
      <div class="demo-controls__section">
        <span class="demo-controls__label">Highlight</span>
        <button
          v-for="state in states" :key="state.key"
          :class="['state-btn', `state-btn--${state.key}`]"
          @click="applyHighlight(state.key)"
        >{{ state.label }}</button>
        <button class="state-btn" @click="client?.clearHighlight()">Clear</button>
      </div>

      <div class="demo-controls__section">
        <span class="demo-controls__label">Zoom to</span>
        <button @click="zoom?.focusElement('room-101', { scale: 3 })">101</button>
        <button @click="zoom?.focusElement('room-202', { scale: 3 })">202</button>
        <button @click="zoom?.reset()">Reset</button>
      </div>
    </div>
  </div>

  <div class="demo-info">
    <template v-if="selected">
      <strong>{{ selected.title }}</strong>
    </template>
    <span v-else class="demo-info--hint">Click a room</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSvgic } from '@svgic/core/vue'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'
import type { SvgicItem } from '@svgic/core'

const selected = ref<SvgicItem | null>(null)

const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A' },
  { id: 'room-102', title: 'Open Space'         },
  { id: 'room-103', title: 'Meeting Room B'     },
  { id: 'room-201', title: 'Directors Office'   },
  { id: 'room-202', title: 'Break Room'         },
  { id: 'room-203', title: 'Storage'            },
]

const states = [
  { key: 'free',  label: 'Free'  },
  { key: 'busy',  label: 'Busy'  },
]

const zoom = ZoomPlugin({ wheelMode: 'ctrl', minScale: 0.5, maxScale: 6 })

const { containerRef, client } = useSvgic({
  src: '/svgs/rooms.svg',
  layers: { rooms: { role: 'interactive' } },
  data,
  plugins: [zoom],
  style: {
    default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
    hover:   { fill: '#4a4a80' },
    states: {
      free: { fill: '#1a4731', stroke: '#2d9e5a', strokeWidth: 1.5 },
      busy: { fill: '#4a1e1e', stroke: '#e03030', strokeWidth: 1.5 },
    },
  },
  on: {
    click: (_id, item) => { selected.value = item },
  },
})

const groups = {
  free: ['room-101', 'room-103', 'room-202'],
  busy: ['room-102', 'room-201'],
}

function applyHighlight(state: 'free' | 'busy') {
  client.value?.clearHighlight()
  client.value?.setHighlight(state, groups[state])
}
</script>

<style scoped>
.demo-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.demo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.demo-controls__section {
  display: flex;
  align-items: center;
  gap: 6px;
}
.demo-controls__label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-right: 2px;
}
.demo-controls__section button,
.state-btn {
  padding: 4px 10px;
  border-radius: 5px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.demo-controls__section button:hover,
.state-btn:hover { color: var(--vp-c-text-1); }
.state-btn--free { color: #2d9e5a; border-color: #2d9e5a33; }
.state-btn--busy { color: #e03030; border-color: #e0303033; }
.demo-info {
  margin-top: 4px;
  padding: 8px 14px;
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 14px;
  min-height: 36px;
}
.demo-info strong { color: var(--vp-c-text-1); }
.demo-info--hint  { color: var(--vp-c-text-3); font-style: italic; }
</style>
