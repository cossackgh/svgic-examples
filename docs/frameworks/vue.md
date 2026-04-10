# Vue 3

Svgic ships a Vue 3 adapter with a component and a composable.

## SvgicVue component

Drop-in component. Reacts to `:data` changes automatically.

<DemoBlock label="SvgicVue component">
  <VueComponentDemo />
</DemoBlock>

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SvgicVue } from '@svgic/core/vue'
import type { SvgicItem } from '@svgic/core'

const rooms = ref<SvgicItem[]>([
  { id: 'room-101', title: 'Conference Room A', description: 'Capacity: 12' },
  { id: 'room-102', title: 'Open Space',         description: 'Capacity: 30' },
])

function onRoomClick(id: string | null, item: SvgicItem | null) {
  console.log(id, item)
}
</script>

<template>
  <SvgicVue
    src="/map.svg"
    :layers="{ rooms: { role: 'interactive' } }"
    :data="rooms"
    :popup="{ placement: 'cursor' }"
    :style-config="{
      default: { fill: '#2d2d52', cursor: 'pointer' },
      hover:   { fill: '#4a4a80' },
    }"
    @click="onRoomClick"
  />
</template>
```

### Component props

| Prop          | Type                        | Description                        |
|---------------|-----------------------------|------------------------------------|
| `src`         | `string`                    | URL or SVG string (required)       |
| `data`        | `SvgicItem[]`               | Data to bind to elements           |
| `layers`      | `Record<string, SvgicLayer>`| SVG layer definitions              |
| `plugins`     | `SvgicPlugin[]`             | Plugins                            |
| `popup`       | `PopupOption`               | Popup configuration                |
| `styleConfig` | `SvgicStyleConfig`          | Interactive element styling        |

> `styleConfig` — named differently from core to avoid conflict with the native `style` prop.

### Component events

| Event    | Signature                                           |
|----------|-----------------------------------------------------|
| `@click` | `(id: string \| null, item: SvgicItem \| null) => void` |
| `@hover` | `(id: string \| null, item: SvgicItem \| null) => void` |
| `@leave` | `(id: string \| null, item: SvgicItem \| null) => void` |

---

## useSvgic composable

Use when you need direct access to the client instance — for `setHighlight`, plugins, programmatic zoom, etc.

<DemoBlock label="useSvgic composable + ZoomPlugin + setHighlight">
  <VueComposableDemo />
</DemoBlock>

```vue
<script setup lang="ts">
import { useSvgic } from '@svgic/core/vue'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'

const zoom = ZoomPlugin({ wheelMode: 'ctrl' })

const { containerRef, client } = useSvgic({
  src: '/map.svg',
  layers: { rooms: { role: 'interactive' } },
  data: rooms,
  plugins: [zoom],
  style: {
    default: { fill: '#2d2d52', cursor: 'pointer' },
    hover:   { fill: '#4a4a80' },
    states: {
      free: { fill: '#1a4731', stroke: '#2d9e5a', strokeWidth: 1.5 },
      busy: { fill: '#4a1e1e', stroke: '#e03030', strokeWidth: 1.5 },
    },
  },
  on: {
    click: (id, item) => { selected.value = item },
  },
})

// client is shallowRef<Svgic | null> — available after mount
function highlight() {
  client.value?.setHighlight('free', ['room-101', 'room-103'])
}

function resetZoom() {
  zoom.reset()
}
</script>

<template>
  <div :ref="containerRef" />
</template>
```

`client` is a `shallowRef<Svgic | null>` — `null` before mount, `Svgic` instance after.

<script setup>
import VueComponentDemo from '../.vitepress/theme/components/demos/VueComponentDemo.vue'
import VueComposableDemo from '../.vitepress/theme/components/demos/VueComposableDemo.vue'
</script>
