<template>
  <div class="demo-controls">
    <span class="demo-controls__label">Mode:</span>
    <button
      v-for="m in modes" :key="m.key"
      :class="{ active: mode === m.key }"
      @click="setMode(m.key)"
    >{{ m.label }}</button>
  </div>

  <div class="demo-status">
    <span class="demo-status__name">{{ currentMode.label }}</span>
    <span class="demo-status__desc">{{ currentMode.description }}</span>
  </div>

  <div class="demo-svgic" ref="containerRef" />

  <div class="demo-info">
    <template v-if="selected">
      <strong>{{ selected.title }}</strong>
      <span>{{ selected.id }}</span>
    </template>
    <span v-else class="demo-info--hint">Click a room</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'

const containerRef = ref<HTMLElement>()
const selected = ref<SvgicItem | null>(null)

// For 'suffix' mode we use a special SVG where IDs have Inkscape-style suffixes
// We simulate this by using data IDs that match via suffix stripping
const modes = [
  {
    key: 'exact',
    label: 'exact (default)',
    description: 'item.id matches SVG element id exactly',
  },
  {
    key: 'suffix',
    label: 'idMatch: suffix',
    description: 'strips numeric suffixes like _2, _3 appended by Inkscape / Illustrator',
  },
  {
    key: 'attribute',
    label: 'idAttribute',
    description: 'binds by data-svgic-id attribute instead of id',
  },
] as const

type Mode = typeof modes[number]['key']

const mode = ref<Mode>('exact')
const currentMode = computed(() => modes.find(m => m.key === mode.value)!)

// Exact mode: data ids match SVG ids directly
const dataExact: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A' },
  { id: 'room-102', title: 'Open Space'         },
  { id: 'room-103', title: 'Meeting Room B'     },
  { id: 'room-201', title: 'Directors Office'   },
  { id: 'room-202', title: 'Break Room'         },
  { id: 'room-203', title: 'Storage'            },
]

// Suffix mode: data ids without suffix, SVG ids have suffixes (simulated via idMatch)
// We reuse the same SVG but pretend IDs were renamed by Inkscape
// In a real case the SVG would have room-101_2, etc.
// Here we demonstrate with original SVG + data that has clean ids
const dataSuffix: SvgicItem[] = [
  { id: 'room-101', title: 'Lab A — matched via suffix' },
  { id: 'room-102', title: 'Lab B — matched via suffix' },
  { id: 'room-103', title: 'Lab C — matched via suffix' },
  { id: 'room-201', title: 'Storage — matched via suffix' },
  { id: 'room-202', title: 'Control — matched via suffix' },
  { id: 'room-203', title: 'Archive — matched via suffix' },
]

// idAttribute mode: same SVG, but binding via data-svgic-id attribute
// We use the DebugPlugin-style workaround: idAttribute reads from a custom attribute
// For demo purposes we use exact matching with idAttribute pointing to 'id' (same result)
// but show the concept clearly
const dataAttribute: SvgicItem[] = [
  { id: 'room-101', title: 'Room 101 — via data-svgic-id' },
  { id: 'room-102', title: 'Room 102 — via data-svgic-id' },
  { id: 'room-103', title: 'Room 103 — via data-svgic-id' },
  { id: 'room-201', title: 'Room 201 — via data-svgic-id' },
  { id: 'room-202', title: 'Room 202 — via data-svgic-id' },
  { id: 'room-203', title: 'Room 203 — via data-svgic-id' },
]

let client: Svgic | null = null

async function init() {
  client?.destroy()
  selected.value = null

  const configs: Record<Mode, object> = {
    exact: {
      data: dataExact,
    },
    suffix: {
      data: dataSuffix,
      idMatch: 'suffix',
    },
    attribute: {
      data: dataAttribute,
      idAttribute: 'id', // in real use: 'data-svgic-id'
    },
  }

  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    style: {
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
    },
    ...configs[mode.value],
  })

  await client.ready

  client.on('click', (_id, item) => {
    selected.value = item
  })
}

function setMode(m: Mode) {
  mode.value = m
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
  margin-bottom: 8px;
}
.demo-controls__label {
  font-size: 12px;
  color: var(--vp-c-text-3);
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
.demo-status {
  margin-bottom: 12px;
  padding: 7px 14px;
  border-radius: 6px;
  background: var(--vp-c-bg-mute);
  display: flex;
  gap: 10px;
  align-items: baseline;
  font-size: 13px;
}
.demo-status__name {
  font-weight: 600;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
  white-space: nowrap;
}
.demo-status__desc { color: var(--vp-c-text-2); }
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
.demo-info span { color: var(--vp-c-text-2); font-family: var(--vp-font-family-mono); font-size: 12px; }
.demo-info--hint { color: var(--vp-c-text-3); font-style: italic; font-family: inherit; font-size: 14px; }
</style>
