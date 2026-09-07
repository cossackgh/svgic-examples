---
layout: page
sidebar: false
aside: false
---

<div class="showcase">

# Engine room

A ship's central cooling system, running. Start and stop pumps, open and shut valves, foul the strainer, take her into tropical water — the panel works out what happens and repaints itself every second. This is the case where the schema is not a map of things but a plant with behaviour.

<ClientOnly>
  <EngineRoom />
</ClientOnly>

<div class="showcase__notes">

## What the library is doing here

| | |
|---|---|
| **Live data** | the plant is stepped once a second and handed back through `setData()`; the `onDataChange` hook redraws every instrument face from the new records |
| **Custom content** | the instrument faces are a `custom` candidate — the reading and its unit want two different sizes, so the renderer returns an SVG element and the plugin measures it and fits it to the box. The other showcases only needed text and images |
| **Eight states** | `running`, `stopped`, `open`, `shut`, `flow`, `idle`, `warning`, `alarm`. Machinery and pipework never share a state, so the lists stay disjoint; the alarm colours are declared last, because an instrument in alarm has to look like one whatever else is true of it |
| **Motion in the file** | the library says *which* pipes are flowing by adding a class. How that reads — a dashed line crawling along the run — is the drawing's own business, declared in the SVG next to `@media (prefers-reduced-motion: reduce)` |
| **Hover** | a `render` callback: what a unit is, whether it is running, what a pipe carries and at what rate, and any alarm standing against that instrument |
| **Clicking** | pumps start and stop, valves open and shut, straight from the mimic. The library reports the id; the plant decides what that means |

## The cascade

The reason to build this rather than a fourth directory: press **Trip the duty SW pump** and watch.

Seawater pressure falls. With **Auto** on, the standby pump starts itself and the log says so; pressure recovers, the alarm clears, and the plant settles. Turn Auto off first and the same trip takes a different course — flow stops, the cooler stops taking heat out, the engine outlet climbs through its warning into its alarm, and the three-way valve sits where you left it because nothing is controlling it any more.

**Foul the strainer** is the slower version of the same story: differential up, flow down, the engine inlet drifting above its setpoint until the three-way valve runs out of travel.

None of that is scripted. `step()` in `data/engineroom.ts` is a pure function of the previous state and the controls — the same plant and the same handle always give the same next second, which is what makes a panel worth trusting when things start going wrong.

## The plant

Seawater along the bottom of the sheet, the freshwater loop above it, the cooler between them — the arrangement engine-room panels have used since they were painted on steel, because it puts the sea at the bottom of the page where it belongs. The symbols are the conventional ones: a circle with a wedge is a pump, a bowtie is a valve.

`scripts/gen-engineroom.mjs` draws it. Three layers are interactive — `equipment`, `pipes`, `readouts` — and nothing else is; the labels, the hull and the sea are drawn once and never touched.

The plant only runs while the page is on screen — a hidden tab is not a watch — and it picks up where it left off when you come back.

The numbers are the shape of the real thing rather than the real thing: heat in from engine load, heat out through the cooler, pressure from how many pumps are running, and a first-order lag on everything so the gauges move the way gauges move. Enough for the panel to behave, not enough to run a ship.

[The content plugin →](/examples/content) · [Styling and highlight →](/examples/styling) · [Theatre seats →](/showcase/theatre)

</div>
</div>

<script setup>
import EngineRoom from '../.vitepress/theme/components/demos/EngineRoom.vue'
</script>

<style scoped>
.showcase {
  max-width: 1240px;
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
