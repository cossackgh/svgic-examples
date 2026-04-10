# Events

`click`, `hover`, `leave` — the three events emitted by Svgic.
Hover over and click rooms to see what each event delivers.

<DemoBlock>
  <EventsDemo />
</DemoBlock>

<script setup>
import EventsDemo from '../.vitepress/theme/components/demos/EventsDemo.vue'
</script>

## Subscribing

```ts
client.on('click', (id, item) => { ... })
client.on('hover', (id, item) => { ... })
client.on('leave', (id, item) => { ... })
```

## Event table

| Event   | When                          | `id`            | `item`               |
|---------|-------------------------------|-----------------|----------------------|
| `click` | click on an element           | element id      | bound data or `null` |
| `click` | click on empty area           | `null`          | `null`               |
| `hover` | cursor enters an element      | element id      | bound data or `null` |
| `leave` | cursor leaves an element      | element id      | bound data or `null` |

`item` is `null` when the element exists in the SVG but has no matching entry in `data`.

## Usage example

```ts
client.on('click', (id, item) => {
  if (id === null) {
    // clicked empty area — deselect
    panel.hide()
    return
  }

  if (item === null) {
    // clicked an SVG element with no bound data
    console.warn('no data for', id)
    return
  }

  panel.show(item)
})
```
