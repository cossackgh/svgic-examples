# Styling & Highlight

Svgic manages element appearance via config — no manual CSS needed.
Assign rooms to states with the buttons below, then hover over them to see `highlightedHover` in action.

<DemoBlock>
  <StylingDemo />
</DemoBlock>

<script setup>
import StylingDemo from '../.vitepress/theme/components/demos/StylingDemo.vue'
</script>

## Style config

```ts
new Svgic('#container', {
  style: {
    // Applied to all interactive elements by default
    default: {
      fill:       '#2d2d52',
      cursor:     'pointer',
      transition: 'fill 0.15s',
    },

    // On hover (when element has no active state)
    hover: {
      fill: '#4a4a80',
    },

    // On hover over a highlighted element — applied on top of the state style
    highlightedHover: {
      opacity: 0.75,
    },

    // Named states for setHighlight()
    states: {
      free:       { fill: '#1a4731', stroke: '#2d9e5a', strokeWidth: 1.5 },
      busy:       { fill: '#4a1e1e', stroke: '#e03030', strokeWidth: 1.5 },
      restricted: { fill: '#3d2a0a', stroke: '#d97706', strokeWidth: 1.5 },
    },
  },
})
```

## setHighlight

```ts
// Assign a named state to a group of elements
client.setHighlight('free', ['room-101', 'room-103'])
client.setHighlight('busy', ['room-102'])

// Multiple states can be active simultaneously
// Each element can only have one state at a time — last write wins

// Clear a specific state
client.clearHighlight('free')

// Clear all states
client.clearHighlight()
```

## State priority

| Element classes              | Applied style                        |
|------------------------------|--------------------------------------|
| _(none)_                     | `default`                            |
| `svgic-hover`                | `hover`                              |
| `svgic-state-free`           | `states.free`                        |
| `svgic-hover` + `svgic-state-free` | `highlightedHover` on top of `states.free` |

Styles are applied as CSS classes on the parent `<g>` element.  
Only direct child shapes (`<path>`, `<rect>`, etc.) are affected — nested `<g>` elements are not.
