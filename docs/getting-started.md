# Getting Started

## Installation

```bash
npm install @svgic/core
```

## Basic Example

Click on a room to see the bound data.

<DemoBlock label="vanilla JS">
  <GettingStartedDemo />
</DemoBlock>

<script setup>
import GettingStartedDemo from './.vitepress/theme/components/demos/GettingStartedDemo.vue'
</script>

```ts
import { Svgic } from '@svgic/core'

const client = new Svgic('#container', {
  src: '/svgs/rooms.svg',
  layers: {
    rooms: { role: 'interactive' },
  },
  data: [
    { id: 'room-101', title: 'Conference Room A', description: 'Capacity: 12' },
    { id: 'room-102', title: 'Open Space',         description: 'Capacity: 30' },
    { id: 'room-103', title: 'Meeting Room B',     description: 'Capacity: 6'  },
    { id: 'room-201', title: 'Directors Office',   description: 'Capacity: 4'  },
    { id: 'room-202', title: 'Break Room',         description: 'Capacity: 10' },
    { id: 'room-203', title: 'Storage',            description: 'Capacity: —'  },
  ],
  style: {
    default:  { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
    hover:    { fill: '#4a4a80' },
  },
})

await client.ready

client.on('click', (id, item) => {
  console.log(id, item)
})
```

## SVG Structure

The SVG must contain `<g id="...">` elements matching the keys in `layers`.  
Interactive elements are direct children of the interactive layer, identified by `id`.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <g id="background">
    <!-- static shapes -->
  </g>

  <g id="rooms">
    <g id="room-101"> ... </g>
    <g id="room-102"> ... </g>
  </g>
</svg>
```

## Next Steps

- [Events](/examples/events) — click, hover, leave
- [Popup](/examples/popup/cursor) — built-in hover popups
- [Styling & Highlight](/examples/styling) — visual states
- [ZoomPlugin](/examples/zoom) — zoom and pan
