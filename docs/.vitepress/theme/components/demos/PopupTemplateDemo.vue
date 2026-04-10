<template>
  <div class="demo-svgic" ref="containerRef" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'

const containerRef = ref<HTMLElement>()

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
  // Create the template element programmatically —
  // in a regular HTML page this would be a <template id="room-popup"> tag
  const tpl = document.createElement('template')
  tpl.innerHTML = `
    <div class="room-popup">
      <div class="room-popup__title"></div>
      <div class="room-popup__desc"></div>
      <div class="room-popup__floor"></div>
    </div>
  `

  client = new Svgic(containerRef.value!, {
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data,
    popup: {
      placement: 'cursor',
      template: tpl,
      bind(el, item) {
        el.querySelector('.room-popup__title')!.textContent = item.title ?? ''
        el.querySelector('.room-popup__desc')!.textContent  = item.description ?? ''
        el.querySelector('.room-popup__floor')!.textContent = `Floor ${item.floor}`
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
