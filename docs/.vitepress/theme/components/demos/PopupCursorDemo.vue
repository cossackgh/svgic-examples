<template>
  <div class="demo-svgic" ref="containerRef" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem, PopupOption } from '@svgic/core'

const props = defineProps<{ mode: 'simple' | 'custom' }>()

const containerRef = ref<HTMLElement>()

const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A', description: 'Capacity: 12', floor: 1 },
  { id: 'room-102', title: 'Open Space',         description: 'Capacity: 30', floor: 1 },
  { id: 'room-103', title: 'Meeting Room B',     description: 'Capacity: 6',  floor: 1 },
  { id: 'room-201', title: 'Directors Office',   description: 'Capacity: 4',  floor: 2 },
  { id: 'room-202', title: 'Break Room',         description: 'Capacity: 10', floor: 2 },
  { id: 'room-203', title: 'Storage',            description: 'Capacity: —',  floor: 2 },
]

function makePopup(): PopupOption {
  if (props.mode === 'simple') {
    return { placement: 'cursor' }
  }

  return {
    placement: 'cursor',
    render(item) {
      const el = document.createElement('div')
      el.className = 'svgic-custom-popup'
      const title = document.createElement('div')
      title.className = 'svgic-custom-popup__title'
      title.textContent = item.title ?? ''
      const desc = document.createElement('div')
      desc.className = 'svgic-custom-popup__desc'
      desc.textContent = item.description ?? ''
      const floor = document.createElement('div')
      floor.className = 'svgic-custom-popup__floor'
      floor.textContent = `Floor ${item.floor}`
      el.append(title, desc, floor)
      return el
    },
  }
}

let client: Svgic | null = null

onMounted(async () => {
  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data,
    popup: makePopup(),
    style: {
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
    },
  })
  await client.ready
})

onUnmounted(() => client?.destroy())
</script>
