<template>
  <div class="demo-svgic" ref="containerRef" />

  <div class="demo-controls">
    <span class="demo-controls__label">Dataset:</span>
    <button
      v-for="(meta, key) in datasetMeta" :key="key"
      :class="{ active: currentDataset === key }"
      @click="loadDataset(key)"
    >{{ meta.label }}</button>
  </div>

  <div class="demo-status">
    <span class="demo-status__name">{{ datasetMeta[currentDataset].label }}</span>
    <span class="demo-status__desc">{{ datasetMeta[currentDataset].description }}</span>
  </div>

  <div v-if="selected" class="demo-info">
    <strong>{{ selected.title }}</strong>
    <span v-if="selected.description">{{ selected.description }}</span>
    <span class="demo-info__type" :data-type="selected.type">{{ selected.type }}</span>
  </div>
  <div v-else class="demo-info demo-info--hint">Click a room</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'

const containerRef = ref<HTMLElement>()
const selected = ref<SvgicItem | null>(null)
const currentDataset = ref<'offices' | 'labs' | 'empty'>('offices')

const datasetMeta = {
  offices: { label: 'Offices',    description: '6 rooms bound — all interactive' },
  labs:    { label: 'Labs',       description: '5 rooms bound — room 203 has no data, becomes non-interactive' },
  empty:   { label: 'No data',    description: '0 rooms bound — all non-interactive' },
}

const datasets: Record<string, SvgicItem[]> = {
  offices: [
    { id: 'room-101', title: 'CEO Office',        description: 'Floor 1', type: 'office' },
    { id: 'room-102', title: 'Finance Dept',       description: 'Floor 1', type: 'office' },
    { id: 'room-103', title: 'HR Department',      description: 'Floor 1', type: 'office' },
    { id: 'room-201', title: 'Engineering',        description: 'Floor 2', type: 'office' },
    { id: 'room-202', title: 'Design Studio',      description: 'Floor 2', type: 'office' },
    { id: 'room-203', title: 'Archive',            description: 'Floor 2', type: 'storage' },
  ],
  labs: [
    { id: 'room-101', title: 'Lab A',   description: 'Chemistry',  type: 'lab' },
    { id: 'room-102', title: 'Lab B',   description: 'Biology',    type: 'lab' },
    { id: 'room-103', title: 'Lab C',   description: 'Physics',    type: 'lab' },
    { id: 'room-201', title: 'Storage', description: 'Chemicals',  type: 'storage' },
    { id: 'room-202', title: 'Control', description: 'Monitoring', type: 'office' },
    // room-203 intentionally has no data — will be unbound
  ],
  empty: [],
}

let client: Svgic | null = null

function loadDataset(name: typeof currentDataset.value) {
  selected.value = null
  currentDataset.value = name
  client?.setData(datasets[name])
}

onMounted(async () => {
  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data: datasets.offices,
    style: {
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
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
.demo-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.demo-controls__label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-right: 2px;
}
.demo-controls button {
  padding: 5px 14px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.demo-controls button:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}
.demo-controls button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}
.demo-status {
  margin-top: 8px;
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
  color: var(--vp-c-brand-1);
}
.demo-status__desc {
  color: var(--vp-c-text-2);
}
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
.demo-info__type {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.6;
}
.demo-info--hint {
  color: var(--vp-c-text-3);
  font-style: italic;
}
</style>
