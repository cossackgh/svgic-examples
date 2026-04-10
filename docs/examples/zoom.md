# ZoomPlugin

Built-in plugin for zoom and pan. No external dependencies.

Use **Ctrl + scroll** to zoom, **drag** to pan. Or use the programmatic buttons below.

<DemoBlock>
  <ZoomDemo />
</DemoBlock>

<script setup>
import ZoomDemo from '../.vitepress/theme/components/demos/ZoomDemo.vue'
</script>

## Setup

```ts
import { Svgic } from '@svgic/core'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'

const zoom = ZoomPlugin({
  wheelMode: 'ctrl',  // zoom only when Ctrl is held
  minScale: 0.5,
  maxScale: 8,
})

const client = new Svgic('#container', {
  src: '/map.svg',
  plugins: [zoom],
})
```

## Programmatic API

```ts
zoom.zoomTo(3)                          // zoom to scale 3 (centered on viewBox)
zoom.panTo(100, 200)                    // pan to SVG coordinates
zoom.focusElement('room-101')           // zoom + center on element
zoom.focusElement('room-101', { scale: 3 })
zoom.reset()                            // back to original viewBox
zoom.getState()                         // → { scale, x, y }

// Animate option per-call
zoom.reset({ animate: false })
zoom.zoomTo(2, { animate: true })
```

## Options

| Option              | Type                   | Default   | Description                                    |
|---------------------|------------------------|-----------|------------------------------------------------|
| `wheelMode`         | `'ctrl' \| 'always'`   | `'ctrl'`  | `ctrl` — zoom with Ctrl held; `always` — always zoom |
| `minScale`          | `number`               | `0.5`     | Minimum scale                                  |
| `maxScale`          | `number`               | `10`      | Maximum scale                                  |
| `pan`               | `boolean`              | `true`    | Allow mouse pan                                |
| `touch`             | `boolean`              | `true`    | Allow touch gestures (pinch, swipe)            |
| `doubleTapScale`    | `number`               | `2`       | Scale on double tap                            |
| `panBounds`         | `boolean`              | `true`    | Restrict pan to SVG bounds                     |
| `animate`           | `boolean`              | `true`    | Animate programmatic transitions               |
| `animationDuration` | `number`               | `300`     | Animation duration in ms                       |
| `focusOnClick`      | `boolean`              | `false`   | Auto-focus element on click                    |
| `focusScale`        | `number`               | `2`       | Scale used when auto-focusing                  |

## Touch gestures

| Gesture            | Action                     |
|--------------------|----------------------------|
| Two fingers        | Pinch-to-zoom              |
| One finger         | Pan                        |
| Double tap         | Zoom in / reset            |
