<template>
  <div class="demo-svgic" ref="containerRef" />

  <div class="styling-controls">
    <div v-for="state in states" :key="state.key" class="styling-controls__row">
      <span class="styling-controls__state" :data-state="state.key">{{ state.label }}</span>
      <div class="styling-controls__rooms">
        <button
          v-for="room in roomList"
          :key="room.id"
          :class="{ active: roomStates[room.id] === state.key }"
          @click="toggleRoom(state.key, room.id)"
        >{{ room.label }}</button>
      </div>
    </div>
    <button class="styling-controls__clear" @click="clearAll">Clear all</button>
  </div>

  <div class="demo-info">
    <template v-if="hovered">
      <strong>{{ hovered.title }}</strong>
      <span class="demo-info__state" :data-state="roomStates[hovered.id] ?? ''">
        {{ roomStates[hovered.id] ?? 'no state' }}
      </span>
    </template>
    <span v-else class="demo-info--hint">Hover a room</span>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'

const containerRef = ref<HTMLElement>()
const hovered = ref<SvgicItem | null>(null)

const states = [
  { key: 'free',       label: 'Free'       },
  { key: 'busy',       label: 'Busy'       },
  { key: 'restricted', label: 'Restricted' },
]

const roomList = [
  { id: 'room-101', label: '101' },
  { id: 'room-102', label: '102' },
  { id: 'room-103', label: '103' },
  { id: 'room-201', label: '201' },
  { id: 'room-202', label: '202' },
  { id: 'room-203', label: '203' },
]

const data: SvgicItem[] = roomList.map(r => ({ id: r.id, title: `Room ${r.label}` }))

// roomId → current state key (or undefined)
const roomStates = reactive<Record<string, string>>({})

let client: Svgic | null = null

function applyHighlights() {
  if (!client) return
  client.clearHighlight()
  const grouped: Record<string, string[]> = {}
  for (const [id, state] of Object.entries(roomStates)) {
    if (!grouped[state]) grouped[state] = []
    grouped[state].push(id)
  }
  for (const [state, ids] of Object.entries(grouped)) {
    client.setHighlight(state, ids)
  }
}

function toggleRoom(stateKey: string, roomId: string) {
  if (roomStates[roomId] === stateKey) {
    delete roomStates[roomId]
  } else {
    roomStates[roomId] = stateKey
  }
  applyHighlights()
}

function clearAll() {
  for (const key of Object.keys(roomStates)) delete roomStates[key]
  client?.clearHighlight()
}

onMounted(async () => {
  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data,
    style: {
      default:          { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:            { fill: '#4a4a80' },
      highlightedHover: { opacity: 0.75 },
      states: {
        free:       { fill: '#1a4731', stroke: '#2d9e5a', strokeWidth: 1.5 },
        busy:       { fill: '#4a1e1e', stroke: '#e03030', strokeWidth: 1.5 },
        restricted: { fill: '#3d2a0a', stroke: '#d97706', strokeWidth: 1.5 },
      },
    },
  })

  await client.ready

  client.on('hover', (_id, item) => { hovered.value = item })
  client.on('leave', () => { hovered.value = null })
})

onUnmounted(() => {
  client?.destroy()
})
</script>

<style scoped>
.styling-controls {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.styling-controls__row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.styling-controls__state {
  min-width: 80px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
[data-state="free"]       { color: #2d9e5a; }
[data-state="busy"]       { color: #e03030; }
[data-state="restricted"] { color: #d97706; }

.styling-controls__rooms {
  display: flex;
  gap: 6px;
}
.styling-controls__rooms button {
  width: 40px;
  padding: 4px 0;
  border-radius: 5px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.styling-controls__rooms button:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}
.styling-controls__rooms button.active {
  border-color: currentColor;
  background: var(--vp-c-bg-mute);
}
.styling-controls__row:nth-child(1) button.active { color: #2d9e5a; }
.styling-controls__row:nth-child(2) button.active { color: #e03030; }
.styling-controls__row:nth-child(3) button.active { color: #d97706; }

.styling-controls__clear {
  align-self: flex-start;
  margin-top: 4px;
  padding: 4px 12px;
  border-radius: 5px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 12px;
  cursor: pointer;
}
.styling-controls__clear:hover {
  color: var(--vp-c-text-1);
}
.demo-info {
  margin-top: 10px;
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
.demo-info--hint {
  color: var(--vp-c-text-3);
  font-style: italic;
}
.demo-info__state {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
}
.demo-info__state[data-state="free"]       { color: #2d9e5a; }
.demo-info__state[data-state="busy"]       { color: #e03030; }
.demo-info__state[data-state="restricted"] { color: #d97706; }
</style>
