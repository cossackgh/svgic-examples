---
layout: page
sidebar: false
aside: false
---

<div class="showcase">

# Meeting rooms

One floor, twenty rooms and four phone booths. Move the slider and the whole plan repaints: colour is availability for the slot you asked for, and the label under each name says how long that lasts. Pick a free room and book it — the floor updates from the same data everything else reads.

<ClientOnly>
  <RoomBooking />
</ClientOnly>

<div class="showcase__notes">

## What the library is doing here

| | |
|---|---|
| **Status** | six calls to `setHighlight()` paint the floor — `free`, `soon`, `busy`, `off`, `mine`, `picked`. The component decides which room goes in which list; the colours live in the plan and in the style config |
| **Order** | state rules share one specificity, so a state listed later in `states` wins on the properties it sets. `picked` sets only a stroke, which is why a selected room keeps the colour of its availability |
| **Hover** | every room always carries a state, so the plain `hover` rule can never apply. `highlightedHover` is the one that does — it matches two classes, and outranks any single state |
| **Labels** | `ContentPlugin` writes name, capacity and the next change into each shape — all three lines fit in every room on this floor, and the chain behind them falls back to two lines, then one, then the room number when a shape cannot take them. The booths run a second instance of the plugin, at a larger font and a name only |
| **Live data** | moving the slider calls `setData()`; the plugin redraws every label from the new records through the `onDataChange` hook |
| **Zoom** | `ZoomPlugin` handles wheel, drag and pinch; `focusElement()` flies to the room picked in the list |

The booking itself is ordinary Vue — a list of intervals, a timeline drawn with two divs, a button. The library draws the floor and reports what was clicked.

## The plan itself

`scripts/gen-office.mjs` generates `office-l6.svg`: a corridor loop around the core, rooms in runs along each facade, phone booths standing in the corridor where they actually stand. Only `rooms` and `booths` are interactive — the shell, the core and the zones are drawn once and never touched.

The palette is keyed to `html.dark` rather than `prefers-color-scheme`: VitePress stamps the effective theme on the root element, so following the OS would make the plan fight the site's own light/dark switch.

Availability colours are declared in the plan as `--room-free`, `--room-busy` and the rest, so the application paints by status without knowing a single hex value.

[The content plugin →](/examples/content) · [Styling and highlight →](/examples/styling) · [Mall directory →](/showcase/mall)

</div>
</div>

<script setup>
import RoomBooking from '../.vitepress/theme/components/demos/RoomBooking.vue'
</script>

<style scoped>
.showcase {
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 24px 64px;
}
.showcase h1 { font-size: 34px; font-weight: 700; margin-bottom: 10px; }
.showcase > p { color: var(--vp-c-text-2); max-width: 62ch; margin-bottom: 26px; }
.showcase__notes { margin-top: 42px; max-width: 78ch; }
.showcase__notes h2 { font-size: 19px; margin: 28px 0 10px; }
.showcase__notes table { display: table; width: 100%; font-size: 14px; }
.showcase__notes p { color: var(--vp-c-text-2); }
</style>
