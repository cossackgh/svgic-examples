---
layout: page
sidebar: false
aside: false
---

<div class="showcase">

# Mall directory

Three floors, 49 tenants, search that jumps to the shop and zooms in on it. The plan is a plain SVG file — the names, logos and opening hours come from data, and every shop is clickable because it is a shape with an `id`.

<ClientOnly>
  <MallNavigator />
</ClientOnly>

<div class="showcase__notes">

## What the library is doing here

| | |
|---|---|
| **Binding** | each `<path id="u-101">` in the SVG is matched to a record by `id`; nothing about the tenants is stored in the file |
| **Labels** | `ContentPlugin` places names inside the shapes and swaps in a logo where it fits, a shortened name where it does not, and the unit number as a last resort |
| **Zoom** | `ZoomPlugin` handles wheel, drag and pinch, and `focusElement()` flies to the shop picked in the list |
| **Highlight** | `setHighlight('found', [id])` paints the match — the style lives in config, not in the SVG |
| **Floors** | `setSrc()` swaps the plan and keeps the same client, subscriptions and plugins |

Everything else on this page — the search box, the result list, the card — is ordinary Vue. The library draws the map and tells you what was clicked; the product around it stays yours.

## The plan itself

`scripts/gen-mall.mjs` generates the three floors, so the geometry is reproducible rather than hand-drawn once. Vertical cores — escalators, lifts, stairs — are declared once and shared by every level, which means they line up in plan across floors.

Each file also carries a hidden `nav` layer: a graph of the gallery with `data-links` between nodes and `data-vertical` on the ones that sit at a core. The core ignores that layer (`role: 'data'`), and a routing plugin can read it through `getLayer('nav')`.

Facility icons are [Material Design Icons](https://pictogrammers.com/library/mdi/) inlined at generation time.

[How the content plugin works →](/examples/content) · [Zoom and pan →](/examples/zoom)

</div>
</div>

<script setup>
import MallNavigator from '../.vitepress/theme/components/demos/MallNavigator.vue'
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
