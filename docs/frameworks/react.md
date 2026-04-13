# React

Svgic ships a React adapter with a component and a hook.

## SvgicReact component

Drop-in component. Recreates the client when `src` changes, reactively updates data when `data` changes.

<DemoBlock label="SvgicReact component">
  <ReactMount :component="SvgicReactDemo" />
</DemoBlock>

```tsx
import { useState } from 'react'
import { SvgicReact } from '@svgic/core/react'
import type { SvgicItem } from '@svgic/core'

const rooms: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A', description: 'Capacity: 12' },
  { id: 'room-102', title: 'Open Space',         description: 'Capacity: 30' },
]

function Map() {
  const [selected, setSelected] = useState<SvgicItem | null>(null)

  return (
    <SvgicReact
      src="/map.svg"
      layers={{ rooms: { role: 'interactive' } }}
      data={rooms}
      popup={{ placement: 'cursor' }}
      styleConfig={{
        default: { fill: '#2d2d52', cursor: 'pointer' },
        hover:   { fill: '#4a4a80' },
      }}
      onClick={(_id, item) => setSelected(item)}
    />
  )
}
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
| `onClick`     | `(id, item) => void`        | Click event handler                |
| `onHover`     | `(id, item) => void`        | Hover event handler                |
| `onLeave`     | `(id, item) => void`        | Leave event handler                |
| `className`   | `string`                    | Container CSS class                |
| `style`       | `CSSProperties`             | Container inline styles            |

> `styleConfig` — named differently from core to avoid conflict with the native `style` prop.

---

## useSvgic hook

Use when you need direct access to the client — for `setHighlight`, plugins, programmatic zoom, etc.

<DemoBlock label="useSvgic hook + ZoomPlugin + setHighlight">
  <ReactMount :component="SvgicHookDemo" />
</DemoBlock>

```tsx
import { useSvgic } from '@svgic/core/react'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'

const zoom = ZoomPlugin({ wheelMode: 'ctrl' })

function Map() {
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
  })

  useEffect(() => {
    if (!client) return
    client.on('click', (id, item) => setSelected(item))
  }, [client])

  function highlight() {
    client?.setHighlight('free', ['room-101', 'room-103'])
  }

  return <div ref={containerRef} />
}
```

`client` is `Svgic | null` — `null` before mount, `Svgic` instance after.

<script setup>
import SvgicReactDemo from '../.vitepress/theme/components/demos/SvgicReactDemo.tsx'
import SvgicHookDemo from '../.vitepress/theme/components/demos/SvgicHookDemo.tsx'
</script>
