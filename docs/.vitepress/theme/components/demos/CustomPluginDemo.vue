<template>
  <div class="demo-svgic" ref="containerRef" />

  <div class="plugin-log">
    <div class="plugin-log__header">
      <span>Plugin hooks log</span>
      <div class="plugin-log__stats">
        <span>clicks: <strong>{{ stats.clicks }}</strong></span>
        <span>hovers: <strong>{{ stats.hovers }}</strong></span>
      </div>
      <button @click="log = []">Clear</button>
    </div>
    <div class="plugin-log__body" ref="logRef">
      <div v-if="log.length === 0" class="plugin-log__empty">Interact with the rooms above</div>
      <div v-for="(e, i) in log" :key="i" class="plugin-log__entry" :data-hook="e.hook">
        <span class="plugin-log__hook">{{ e.hook }}</span>
        <span class="plugin-log__text">{{ e.text }}</span>
        <span v-if="e.returned" class="plugin-log__return">→ {{ e.returned }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem, SvgicPlugin } from '@svgic/core'

const containerRef = ref<HTMLElement>()
const logRef = ref<HTMLElement>()

interface LogEntry {
  hook: string
  text: string
  returned?: string
}

const log = ref<LogEntry[]>([])
const stats = reactive({ clicks: 0, hovers: 0 })

function addLog(entry: LogEntry) {
  log.value.push(entry)
  if (log.value.length > 40) log.value.shift()
  nextTick(() => {
    if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
  })
}

const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A' },
  { id: 'room-102', title: 'Open Space'         },
  { id: 'room-103', title: 'Meeting Room B'     },
  { id: 'room-201', title: 'Directors Office'   },
  { id: 'room-202', title: 'Break Room'         },
  { id: 'room-203', title: 'Storage'            },
]

// Selected element tracking
let selectedEl: Element | null = null

let client: Svgic | null = null

onMounted(async () => {
  const loggingPlugin: SvgicPlugin = {
    name: 'logging-plugin',

    onInit(c) {
      addLog({ hook: 'onInit', text: `client ready, ${data.length} items bound` })
    },

    onElementHover(el, item) {
      stats.hovers++
      el.setAttribute('data-hovered', 'true')
      addLog({ hook: 'onElementHover', text: item ? item.title! : el.id })
    },

    onElementLeave(el, item) {
      el.removeAttribute('data-hovered')
      addLog({ hook: 'onElementLeave', text: item ? item.title! : el.id })
    },

    onElementClick(el, item) {
      stats.clicks++

      // Deselect previous
      if (selectedEl && selectedEl !== el) {
        selectedEl.removeAttribute('data-selected')
      }

      // Toggle selection
      if (selectedEl === el) {
        el.removeAttribute('data-selected')
        selectedEl = null
        addLog({ hook: 'onElementClick', text: item?.title ?? el.id, returned: 'false (deselected)' })
      } else {
        el.setAttribute('data-selected', 'true')
        selectedEl = el
        addLog({ hook: 'onElementClick', text: item?.title ?? el.id, returned: 'false (selected)' })
      }

      return false // cancel default click event
    },
  }

  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data,
    plugins: [loggingPlugin],
    style: {
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
    },
  })

  await client.ready
})

onUnmounted(() => {
  selectedEl = null
  client?.destroy()
})
</script>

<style>
/* Applied to SVG elements by the plugin — must be global */
[data-selected] > rect,
[data-selected] > path {
  stroke: #7aa2f7 !important;
  stroke-width: 2px !important;
  fill: #3a3a6a !important;
}
</style>

<style scoped>
.plugin-log {
  margin-top: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  font-size: 13px;
}
.plugin-log__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: var(--vp-c-bg-mute);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}
.plugin-log__stats {
  display: flex;
  gap: 12px;
  margin-left: auto;
  font-weight: 400;
  color: var(--vp-c-text-3);
}
.plugin-log__stats strong { color: var(--vp-c-brand-1); }
.plugin-log__header button {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-3);
  cursor: pointer;
}
.plugin-log__header button:hover { color: var(--vp-c-text-1); }
.plugin-log__body {
  height: 160px;
  overflow-y: auto;
  padding: 8px 0;
  font-family: var(--vp-font-family-mono);
}
.plugin-log__empty {
  padding: 0 12px;
  color: var(--vp-c-text-3);
  font-style: italic;
  font-family: var(--vp-font-family-base);
}
.plugin-log__entry {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 2px 12px;
}
.plugin-log__entry:hover { background: var(--vp-c-bg-soft); }
.plugin-log__hook {
  min-width: 130px;
  font-weight: 700;
  font-size: 11px;
  color: var(--vp-c-text-3);
}
[data-hook="onInit"]          .plugin-log__hook { color: #9ece6a; }
[data-hook="onElementHover"]  .plugin-log__hook { color: #4a9de0; }
[data-hook="onElementLeave"]  .plugin-log__hook { color: #555; }
[data-hook="onElementClick"]  .plugin-log__hook { color: #e07b3a; }
.plugin-log__text  { color: var(--vp-c-text-1); }
.plugin-log__return { color: var(--vp-c-text-3); font-size: 11px; }
</style>
