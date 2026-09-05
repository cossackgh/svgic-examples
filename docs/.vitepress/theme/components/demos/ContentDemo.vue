<template>
  <div class="content-hint">
    <span>Every unit is an awkward shape on purpose — L, U, a ring with a hole, a narrow column, a tiny room</span>
    <span class="content-hint__mode">{{ modeNote }}</span>
  </div>

  <div class="demo-svgic" ref="containerRef" />

  <div class="content-controls">
    <div class="content-controls__group">
      <span class="content-controls__label">Content</span>
      <button
        v-for="option in modes"
        :key="option.value"
        :class="{ active: mode === option.value }"
        @click="setMode(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
    <div class="content-controls__group">
      <span class="content-controls__label">Clip to shape</span>
      <button :class="{ active: clip }" @click="setClip(true)">on</button>
      <button :class="{ active: !clip }" @click="setClip(false)">off</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'
import { ContentPlugin } from '@svgic/core/plugins/content'
import type { ContentCandidate, ContentSlot } from '@svgic/core/plugins/content'

type Mode = 'name' | 'multiline' | 'logo' | 'card'

const SVG_NS = 'http://www.w3.org/2000/svg'

const modes: { value: Mode; label: string }[] = [
  { value: 'name', label: 'name' },
  { value: 'multiline', label: 'multiline' },
  { value: 'logo', label: 'logo' },
  { value: 'card', label: 'card' },
]

const notes: Record<Mode, string> = {
  name: 'name, falling back to the unit number',
  multiline: 'the same names broken into lines',
  logo: 'logo where it fits, name where it does not',
  card: 'a card drawn by the app, scaled into the shape',
}

const units: SvgicItem[] = [
  { id: 'u-101', title: 'Nordic Sport', logo: '/logos/wide.svg', ratio: 4.2 },
  { id: 'u-102', title: 'Green Grocer', logo: '/logos/square.svg', ratio: 1 },
  { id: 'u-103', title: 'Coffee & Bakery', logo: '/logos/square.svg', ratio: 1 },
  { id: 'u-104', title: 'Electronics Hypermarket', logo: '/logos/tall.svg', ratio: 100 / 190 },
  { id: 'u-106', title: 'Food Court', logo: '/logos/wide.svg', ratio: 4.2 },
  { id: 'u-107', title: 'Pharmacy', logo: '/logos/square.svg', ratio: 1 },
  { id: 'u-108', title: 'Flowers', logo: '/logos/wide.svg', ratio: 4.2 },
  // u-105 has no data at all — it falls through to the last candidate
]

/** A card the application draws itself: a plate with a name and the unit number */
const renderCard = ({ id, item, rect, fontSize }: ContentSlot): SVGElement => {
  const group = document.createElementNS(SVG_NS, 'g')
  const plate = document.createElementNS(SVG_NS, 'rect')
  const width = Math.max(rect.width, fontSize * 9)
  const height = fontSize * 3.6

  plate.setAttribute('x', String(rect.x + rect.width / 2 - width / 2))
  plate.setAttribute('y', String(rect.y + rect.height / 2 - height / 2))
  plate.setAttribute('width', String(width))
  plate.setAttribute('height', String(height))
  plate.setAttribute('rx', String(fontSize * 0.5))
  plate.setAttribute('fill', '#1a1a2e')
  plate.setAttribute('stroke', '#4a4a80')
  group.appendChild(plate)

  const title = document.createElementNS(SVG_NS, 'text')

  title.textContent = (item?.title as string) ?? id
  title.setAttribute('x', String(rect.x + rect.width / 2))
  title.setAttribute('y', String(rect.y + rect.height / 2 - fontSize * 0.5))
  title.setAttribute('text-anchor', 'middle')
  title.setAttribute('dominant-baseline', 'central')
  title.setAttribute('font-size', String(fontSize))
  title.setAttribute('font-weight', '600')
  title.setAttribute('fill', '#eaeaff')
  group.appendChild(title)

  const caption = document.createElementNS(SVG_NS, 'text')

  caption.textContent = id
  caption.setAttribute('x', String(rect.x + rect.width / 2))
  caption.setAttribute('y', String(rect.y + rect.height / 2 + fontSize * 0.8))
  caption.setAttribute('text-anchor', 'middle')
  caption.setAttribute('dominant-baseline', 'central')
  caption.setAttribute('font-size', String(fontSize * 0.72))
  caption.setAttribute('fill', '#8888aa')
  group.appendChild(caption)

  return group
}

const chains: Record<Mode, ContentCandidate[]> = {
  name: [
    { type: 'text', text: ({ item }) => item?.title as string, fill: '#eaeaff', fontWeight: 600 },
    { type: 'text', text: ({ id }) => id, fill: '#8888aa' },
  ],

  multiline: [
    {
      type: 'text',
      text: ({ item }) => ((item?.title as string) ?? '').split(' '),
      fill: '#eaeaff',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    { type: 'text', text: ({ id }) => id, fill: '#8888aa' },
  ],

  logo: [
    {
      type: 'image',
      href: ({ item }) => item?.logo as string,
      ratio: ({ item }) => item?.ratio as number,
      minHeight: 16,
    },
    { type: 'text', text: ({ item }) => item?.title as string, fill: '#eaeaff', fontWeight: 600 },
    { type: 'text', text: ({ id }) => id, fill: '#8888aa' },
  ],

  card: [
    { type: 'custom', render: renderCard, minScale: 0.45 },
    { type: 'text', text: ({ id }) => id, fill: '#8888aa' },
  ],
}

const containerRef = ref<HTMLElement>()
const mode = ref<Mode>('name')
const clip = ref(true)
const modeNote = ref(notes.name)

let client: Svgic | null = null

const mount = async (): Promise<void> => {
  client?.destroy()
  modeNote.value = notes[mode.value]

  client = new Svgic(containerRef.value!, {
    src: '/svgs/mall.svg',
    layers: { units: { role: 'interactive' } },
    data: units,
    popup: { placement: 'cursor' },
    style: {
      default: { cursor: 'pointer', transition: 'fill 0.15s' },
      hover: { fill: '#4a4a80' },
    },
    plugins: [
      ContentPlugin({
        sourceLayer: 'units',
        clip: clip.value,
        content: chains[mode.value],
      }),
    ],
  })

  await client.ready
}

const setMode = (value: Mode): void => {
  mode.value = value
  void mount()
}

const setClip = (value: boolean): void => {
  clip.value = value
  void mount()
}

onMounted(() => {
  void mount()
})

onUnmounted(() => client?.destroy())
</script>

<style scoped>
.content-hint {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-bottom: 8px;
}
.content-hint__mode {
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-brand-1);
  white-space: nowrap;
}
.content-controls {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.content-controls__group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.content-controls__label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-right: 2px;
}
.content-controls__group button {
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
.content-controls__group button:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-mute);
}
.content-controls__group button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}
</style>
