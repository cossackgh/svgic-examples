# DebugPlugin

Development tool: shows SVG element `id`s directly on the diagram.
Useful during setup to find the right `id`s without opening DevTools.

Room `203` has no data entry — notice the **⚠ no data** warning on it.

<DemoBlock>
  <DebugDemo />
</DemoBlock>

<script setup>
import DebugDemo from '../.vitepress/theme/components/demos/DebugDemo.vue'
</script>

## Setup

```ts
import { Svgic } from '@svgic/core'
import { DebugPlugin } from '@svgic/core/plugins/debug'

const client = new Svgic('#container', {
  src: '/map.svg',
  plugins: [DebugPlugin()],
})
```

Typical pattern — enable via URL parameter so it never reaches production:

```ts
const debug = new URLSearchParams(location.search).has('debug')

new Svgic('#container', {
  plugins: debug ? [DebugPlugin()] : [],
})
// http://localhost:5173/?debug → labels enabled
```

## showOn modes

| Value   | Behavior                                                        |
|---------|-----------------------------------------------------------------|
| `hover` | Label appears on hover, disappears on leave                     |
| `click` | Label is pinned on click, second click removes it               |
| `both`  | Shown on hover; click pins it (highlighted in yellow)           |

## No data warning

If an element exists in the SVG but has no matching entry in `data`, the label shows `⚠ no data`.
This helps quickly identify mismatches between SVG `id`s and data keys.

```
room-101  Conference Room A    ← data found
room-203  ⚠ no data            ← id in SVG, but not in data
```

## Custom render

```ts
DebugPlugin({
  showOn: 'both',
  render(id, item) {
    if (!item) return `${id} ⚠ no data`
    return `${id} · ${item.title} [${item.status}]`
  },
})
```

`render` receives the element `id` and `SvgicItem | null`, returns an `HTMLElement` or string.

::: warning
DebugPlugin is intended for development only. Do not include it in production builds.
:::
