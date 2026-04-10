<template>
  <SvgicVue
    src="/svgs/rooms.svg"
    :layers="{ rooms: { role: 'interactive' } }"
    :data="data"
    :popup="{ placement: 'cursor' }"
    :style-config="{
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
    }"
    class="demo-svgic"
    @click="onClick"
  />

  <div class="demo-info">
    <template v-if="selected">
      <strong>{{ selected.title }}</strong>
      <span>{{ selected.description }}</span>
    </template>
    <span v-else class="demo-info--hint">Click a room</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SvgicVue } from '@svgic/core/vue'
import type { SvgicItem } from '@svgic/core'

const selected = ref<SvgicItem | null>(null)

const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A', description: 'Capacity: 12' },
  { id: 'room-102', title: 'Open Space',         description: 'Capacity: 30' },
  { id: 'room-103', title: 'Meeting Room B',     description: 'Capacity: 6'  },
  { id: 'room-201', title: 'Directors Office',   description: 'Capacity: 4'  },
  { id: 'room-202', title: 'Break Room',         description: 'Capacity: 10' },
  { id: 'room-203', title: 'Storage',            description: 'Capacity: —'  },
]

function onClick(_id: string | null, item: SvgicItem | null) {
  selected.value = item
}
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
  min-height: 36px;
}
.demo-info strong { color: var(--vp-c-text-1); }
.demo-info span   { color: var(--vp-c-text-2); }
.demo-info--hint  { color: var(--vp-c-text-3); font-style: italic; }
</style>
