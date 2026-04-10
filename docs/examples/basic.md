# Basic

Core initialization pattern: creating a client, binding data, and updating it dynamically.

Switch the dataset with the buttons — `setData()` rebinds all elements without recreating the client.
Note that **Lab** dataset leaves room 203 without data — it becomes non-interactive.

<DemoBlock>
  <BasicDemo />
</DemoBlock>

<script setup>
import BasicDemo from '../.vitepress/theme/components/demos/BasicDemo.vue'
</script>

## Setup

```ts
import { Svgic } from '@svgic/core'

const client = new Svgic('#container', {
  src: '/map.svg',
  layers: {
    rooms: { role: 'interactive' },
  },
  data: [
    { id: 'room-101', title: 'CEO Office',   description: 'Floor 1', type: 'office' },
    { id: 'room-102', title: 'Finance Dept', description: 'Floor 1', type: 'office' },
  ],
  style: {
    default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
    hover:   { fill: '#4a4a80' },
  },
})

await client.ready
```

`client.ready` is a Promise that resolves after the SVG is fetched and data is bound.
Always `await` it before calling any API methods.

## Updating data

```ts
client.setData([
  { id: 'room-101', title: 'Lab A', description: 'Chemistry', type: 'lab' },
  { id: 'room-102', title: 'Lab B', description: 'Biology',   type: 'lab' },
  // room-103 has no entry — it becomes non-interactive
])
```

`setData()` rebinds all elements in place — no re-render, no SVG reload.  
Elements without a matching data entry lose their interactivity.

## Cleanup

```ts
client.destroy()
```

Removes all event listeners and clears the container.
Call this when the component unmounts or the map is no longer needed.

## SvgicItem type

```ts
interface SvgicItem {
  id: string            // matched against SVG element id (or custom idAttribute)
  title?: string
  description?: string
  image?: string
  link?: string
  [key: string]: unknown  // any custom fields
}
```

Any extra fields (like `type` in this example) are available in event callbacks.
