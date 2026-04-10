<template>
  <div class="demo-svgic" ref="containerRef" />

  <div class="events-log">
    <div class="events-log__header">
      <span>Event log</span>
      <button @click="events = []">Clear</button>
    </div>
    <div class="events-log__body" ref="logRef">
      <div v-if="events.length === 0" class="events-log__empty">
        Hover or click the rooms above
      </div>
      <div
        v-for="(e, i) in events"
        :key="i"
        class="events-log__entry"
        :data-type="e.type"
      >
        <span class="events-log__type">{{ e.type }}</span>
        <span class="events-log__id">{{ e.id ?? 'null' }}</span>
        <span v-if="e.item" class="events-log__item">→ {{ e.item.title }}</span>
        <span v-else class="events-log__null">→ null</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'

interface LogEntry {
  type: 'click' | 'hover' | 'leave'
  id: string | null
  item: SvgicItem | null
}

const containerRef = ref<HTMLElement>()
const logRef = ref<HTMLElement>()
const events = ref<LogEntry[]>([])

const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A' },
  { id: 'room-102', title: 'Open Space'         },
  { id: 'room-103', title: 'Meeting Room B'     },
  { id: 'room-201', title: 'Directors Office'   },
  { id: 'room-202', title: 'Break Room'         },
  { id: 'room-203', title: 'Storage'            },
]

function log(type: LogEntry['type'], id: string | null, item: SvgicItem | null) {
  events.value.push({ type, id, item })
  if (events.value.length > 30) events.value.shift()
  nextTick(() => {
    if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
  })
}

let client: Svgic | null = null

onMounted(async () => {
  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data,
    style: {
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
    },
  })

  await client.ready

  client.on('click', (id, item) => log('click', id, item))
  client.on('hover', (id, item) => log('hover', id, item))
  client.on('leave', (id, item) => log('leave', id, item))
})

onUnmounted(() => {
  client?.destroy()
})
</script>

<style scoped>
.events-log {
  margin-top: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
}
.events-log__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: var(--vp-c-bg-mute);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}
.events-log__header button {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
}
.events-log__header button:hover {
  color: var(--vp-c-text-1);
}
.events-log__body {
  height: 160px;
  overflow-y: auto;
  padding: 8px 0;
  font-family: var(--vp-font-family-mono);
}
.events-log__empty {
  padding: 0 12px;
  color: var(--vp-c-text-3);
  font-style: italic;
  font-family: var(--vp-font-family-base);
}
.events-log__entry {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 2px 12px;
}
.events-log__entry:hover {
  background: var(--vp-c-bg-soft);
}
.events-log__type {
  min-width: 40px;
  font-weight: 700;
  font-size: 12px;
}
[data-type="click"]  .events-log__type { color: #e07b3a; }
[data-type="hover"]  .events-log__type { color: #4a9de0; }
[data-type="leave"]  .events-log__type { color: #888; }

.events-log__id {
  color: var(--vp-c-text-1);
  min-width: 90px;
}
.events-log__item { color: var(--vp-c-text-2); }
.events-log__null { color: var(--vp-c-text-3); }
</style>
