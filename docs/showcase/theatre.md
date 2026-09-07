---
layout: page
sidebar: false
aside: false
---

<div class="showcase">

# Theatre seats

Six hundred and eighty-three seats, four performances, one basket. Ask for two or three together and the hall marks every run that would work; pick a night and the house repaints around what is already sold.

<ClientOnly>
  <SeatPicker />
</ClientOnly>

<div class="showcase__notes">

## What the library is doing here

| | |
|---|---|
| **Scale** | 683 interactive elements bound to 683 records. The mall runs 49, the meeting floor 24 — this is the case that says whether the library holds up when a schema is a crowd |
| **States** | four `setHighlight()` lists paint the house: `taken`, `over` budget, `run` (part of a group that would seat you together), and `picked`. The price bands are not states — a seat never changes price, so its colour is declared in the plan |
| **Order** | states share one specificity, so a later one wins on the properties it sets. `over` only dims, `taken` restores full opacity so a sold seat never looks like a dim one, and `picked` beats everything |
| **Hover** | a `render` callback at `placement: 'cursor'` — seat, sector, band, price, and what the colour is telling you |
| **Zoom** | `focusElement()` takes an id, so the plan carries an invisible `sectors` group whose boxes bound each block. Flying to the balcony is one call with a real bounding box behind it |

Choosing seats, the basket and the search for neighbours are ordinary Vue. The library draws the house and says which seat was clicked.

Switching performance repaints everything: four lists go in, roughly 1,500 class changes come out across 683 elements, and the whole thing lands in **5–8 ms** on a laptop. Worth knowing before reaching for anything cleverer than "hand it the ids".

## Seats together

The one thing a seating plan has to answer is *can the four of us sit in a row.* `runsOf(size)` walks the house block by block and returns every run of that many free seats.

Blocks, not rows: two seats either side of an aisle carry consecutive numbers and are not together in any sense a theatregoer would accept, so the aisles break the walk. The plan knows where they are because the generator recorded which side of them each seat sits on.

Clicking any seat in a marked run takes the whole run, and **Best seats** picks the one a box office would offer first — nearest the middle of a row, as far forward as the budget reaches.

## The house itself

`scripts/gen-theatre.mjs` writes two files at once: `theatre.svg` and `seats.generated.ts`, one record per seat. They are generated together on purpose — 683 seats cannot be kept in step by hand, and a seat the plan draws but the data has never heard of is exactly the bug this page would be worst at hiding.

Rows sag away from the stage towards their ends and every seat is turned to face the middle of the proscenium, which is most of what makes a seating chart read as a room rather than a spreadsheet.

What is sold is generated per performance from a seeded run, in short blocks rather than at random: tickets go two and three at a time, and a house speckled with single empty seats would make the search for neighbours meaningless. The Sunday closing night is close to full, which is where the search starts earning its place.

[Styling and highlight →](/examples/styling) · [Zoom and pan →](/examples/zoom) · [Meeting rooms →](/showcase/rooms)

</div>
</div>

<script setup>
import SeatPicker from '../.vitepress/theme/components/demos/SeatPicker.vue'
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
