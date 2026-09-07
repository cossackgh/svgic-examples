---
layout: page
sidebar: false
aside: false
---

<div class="showcase">

# Meeting rooms

One floor, twenty rooms and four phone booths. Drag the meeting along the day and the whole plan repaints: colour is availability for the slot you asked for, and the label under each name says how long that lasts. Pick a free room and book it — the floor updates from the same data everything else reads.

<ClientOnly>
  <RoomBooking />
</ClientOnly>

<div class="showcase__notes">

## What the library is doing here

| | |
|---|---|
| **Status** | six calls to `setHighlight()` paint the floor — `free`, `soon`, `busy`, `off`, `mine`, `picked`. The component decides which room goes in which list; the colours live in the plan and in the style config |
| **Order** | state rules share one specificity, so a state listed later in `states` wins on the properties it sets. `picked` sets only a stroke, which is why a selected room keeps the colour of its availability |
| **Hover** (1) | every room always carries a state, so the plain `hover` rule can never apply. `highlightedHover` is the one that does — it matches two classes, and outranks any single state |
| **Labels** | `ContentPlugin` writes name, capacity and the next change into each shape — all three lines fit in every room on this floor, and the chain behind them falls back to two lines, then one, then the room number when a shape cannot take them. The booths run a second instance of the plugin, at a larger font and a name only |
| **Live data** | dragging the meeting calls `setData()`; the plugin redraws every label from the new records through the `onDataChange` hook |
| **Hover** (2) | the popup is a `render` callback in the client config. It is built at hover time, so it reads the requested slot as it stands — status, kit, and when the room next frees up |
| **Zoom** | `ZoomPlugin` handles wheel, drag and pinch; `focusElement()` flies to the room picked in the list |

The popup is anchored to the shape (`placement: 'element'`), so it sits above the room and follows it through a pan or a zoom — the library repositions it on the schema's own `viewchange`. It is mounted on `document.body`, which is why its styles live in a plain `<style>` block: a scoped rule would never reach it.

The booking itself is ordinary Vue — a list of intervals, a strip of divs, a button. The library draws the floor and reports what was clicked.

## One control, said twice

The day appears in two places — above the plan, and inside the room card — and both are the same component bound to the same value. That buys a single vocabulary: **filled means taken, an outline means what you are asking for.** The outline is as wide as the meeting, so switching from 1h to 2h widens it in place and needs no explanation.

It is dragged rather than aimed at. Grabbing the outline keeps hold of the point you took it by, so it slides with the pointer instead of jumping; pressing anywhere else brings it to the pointer and carries on as a drag. The track is measured once when the drag starts — anything the new value changes on the page can reflow it, and re-measuring mid-drag would make the day slide about under the finger. Arrow keys, `Page Up`/`Down`, `Home` and `End` do the same job for the keyboard, and `touch-action: none` keeps a drag on a phone from scrolling the page instead.

Behind the top strip is the floor's own day: a faint histogram of how much is booked, hour by hour, narrowed to the rooms that pass the filters. It answers "when is there anything at all" before anything has been clicked.

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
