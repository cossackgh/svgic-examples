/**
 * Generates the theatre hall used by the seat-picking showcase.
 *
 * Run: node scripts/gen-theatre.mjs docs/public/svgs docs/.vitepress/theme/data
 *
 * Writes two files that have to agree with each other:
 *  - `theatre.svg`, the hall itself;
 *  - `seats.generated.ts`, one record per seat.
 *
 * They are generated together on purpose. Five hundred seats cannot be kept in
 * step by hand, and a seat the plan draws but the data has never heard of is
 * exactly the bug this showcase would be worst at hiding.
 *
 * Rows are gently curved rather than straight: each row sags away from the
 * stage towards its ends, and every seat is turned to face the middle of the
 * proscenium, which is what makes a seating plan read as a room.
 */
import { writeFileSync } from 'node:fs'

const W = 1600
const H = 1040
const [SVG_DIR = '.', DATA_DIR = '.'] = process.argv.slice(2)
const r1 = (n) => Math.round(n * 10) / 10

const CX = W / 2
/** Seat pitch, seat size, and how far a row's ends fall behind its middle */
const PITCH = 26
const SEAT = { w: 20, h: 18, r: 4 }
const AISLE = 22
const SAG = 26
/** Degrees a seat at the very end of a row is turned by */
const TURN = 8

// ------------------------------------------------------------------ sectors

/**
 * `zone` decides the price and the colour; `block` splits a row at the aisles.
 * Seat counts grow towards the back, the way a fan-shaped hall does.
 */
const SECTORS = [
  {
    id: 'st',
    title: 'Stalls',
    rows: 14,
    y0: 250,
    pitchY: 27,
    from: 24,
    to: 32,
    sides: 5,
    /** A cross-aisle after this row, so the block is not one unbroken slab */
    crossAfter: 8,
    crossGap: 20,
    zone: (row) => (row <= 5 ? 'a' : row <= 10 ? 'b' : 'c'),
  },
  {
    id: 'am',
    title: 'Amphitheatre',
    rows: 4,
    y0: 700,
    pitchY: 29,
    from: 34,
    to: 37,
    sides: 6,
    zone: () => 'd',
  },
  {
    id: 'ba',
    title: 'Balcony',
    rows: 3,
    y0: 878,
    pitchY: 30,
    from: 38,
    to: 40,
    sides: 6,
    zone: () => 'e',
  },
]

/** Side boxes: four a side, four seats each, facing the stage from the wings */
const BOXES = [
  { id: 'bx-1', side: 'left', x: 150, y: 330 },
  { id: 'bx-2', side: 'left', x: 150, y: 450 },
  { id: 'bx-3', side: 'left', x: 150, y: 570 },
  { id: 'bx-4', side: 'left', x: 150, y: 690 },
  { id: 'bx-5', side: 'right', x: 1450, y: 330 },
  { id: 'bx-6', side: 'right', x: 1450, y: 450 },
  { id: 'bx-7', side: 'right', x: 1450, y: 570 },
  { id: 'bx-8', side: 'right', x: 1450, y: 690 },
]

// -------------------------------------------------------------------- seats

const seats = []
const svgRows = []
const rowLabels = []
/** Extent of each sector, so the application can fly the view to one of them */
const bounds = new Map()

const cover = (sector, x, y) => {
  const box = bounds.get(sector) ?? { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }

  box.x0 = Math.min(box.x0, x - SEAT.w)
  box.y0 = Math.min(box.y0, y - SEAT.h)
  box.x1 = Math.max(box.x1, x + SEAT.w)
  box.y1 = Math.max(box.y1, y + SEAT.h)
  bounds.set(sector, box)
}

/** Where a seat sits, how far it has fallen behind, and how far it is turned */
const place = (x, baseY, half) => {
  const offset = half === 0 ? 0 : (x - CX) / half

  return { y: baseY + SAG * offset * offset, turn: TURN * offset }
}

for (const sector of SECTORS) {
  for (let row = 1; row <= sector.rows; row++) {
    const step = sector.rows === 1 ? 0 : (row - 1) / (sector.rows - 1)
    const count = Math.round(sector.from + (sector.to - sector.from) * step)
    const middle = count - sector.sides * 2
    const width = count * PITCH + AISLE * 2
    const left = CX - width / 2
    const cross = sector.crossAfter && row > sector.crossAfter ? sector.crossGap : 0
    const baseY = sector.y0 + (row - 1) * sector.pitchY + cross
    const zone = sector.zone(row)
    const marks = []

    for (let index = 0; index < count; index++) {
      // Two aisles: one after the left block, one before the right block
      const gaps = (index >= sector.sides ? AISLE : 0) + (index >= sector.sides + middle ? AISLE : 0)
      const x = left + index * PITCH + PITCH / 2 + gaps
      const { y, turn } = place(x, baseY, width / 2)
      const number = index + 1
      const id = `${sector.id}-${row}-${number}`
      // Which side of the aisles the seat is on. Two seats either side of an
      // aisle have consecutive numbers but are not sitting together
      const block = index < sector.sides ? 'left' : index < sector.sides + middle ? 'centre' : 'right'

      seats.push({ id, sector: sector.title, row, number, zone, block })
      cover(sector.title, x, y)
      marks.push(
        `      <rect id="${id}" class="seat zone-${zone}" x="${r1(x - SEAT.w / 2)}" y="${r1(y - SEAT.h / 2)}"` +
          ` width="${SEAT.w}" height="${SEAT.h}" rx="${SEAT.r}"` +
          ` transform="rotate(${r1(turn)} ${r1(x)} ${r1(y)})" />`,
      )
    }

    const edge = place(left, baseY, width / 2)

    svgRows.push(`    <!-- ${sector.title}, row ${row} -->\n${marks.join('\n')}`)
    rowLabels.push(
      `    <text class="row-no" x="${r1(left - 16)}" y="${r1(edge.y + 4)}">${row}</text>` +
        `<text class="row-no" x="${r1(left + width + 16)}" y="${r1(edge.y + 4)}">${row}</text>`,
    )
  }
}

/** Box walls and names are decoration: they belong with the room, not the seats */
const boxShells = BOXES.map(
  (box, boxIndex) =>
    `    <rect class="box-shell" x="${box.x - 40}" y="${box.y - 32}" width="80" height="64" rx="10" />` +
    `<text class="box-no" x="${box.x}" y="${box.y + 46}">Box ${boxIndex + 1}</text>`,
).join('\n')

const boxMarkup = BOXES.map((box, boxIndex) => {
  const marks = []

  for (let index = 0; index < 4; index++) {
    const x = box.x + (index % 2) * 26 - 13
    const y = box.y + Math.floor(index / 2) * 24 - 12
    const id = `${box.id}-${index + 1}`

    seats.push({ id, sector: 'Boxes', row: boxIndex + 1, number: index + 1, zone: 'box', block: 'box' })
    cover('Boxes', x, y)
    marks.push(
      `      <rect id="${id}" class="seat zone-box" x="${r1(x - SEAT.w / 2)}" y="${r1(y - SEAT.h / 2)}"` +
        ` width="${SEAT.w}" height="${SEAT.h}" rx="${SEAT.r}" />`,
    )
  }

  return `    <!-- Box ${boxIndex + 1} -->\n` + marks.join('\n')
}).join('\n')

// ------------------------------------------------------------------- pieces

/** The stage: a shallow apron bulging towards the hall */
const STAGE = 'M400 46 H1200 V132 Q800 196 400 132 Z'

const sectorLabel = (text, y) =>
  `    <text class="sector-no" x="${CX}" y="${y}">${text}</text>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="hall-plan">
  <style>
    .hall-plan {
      --hall-bg: #f3f5fa; --hall-floor: #ffffff; --hall-line: #97a4bd;
      --hall-hair: #c2cadb; --hall-ink: #3d4761; --hall-mute: #8b96b1;
      --hall-stage: #dfe5f0; --hall-accent: #2f6df6; --hall-on-accent: #ffffff;
      /* Price zones. Named here so the application can paint by category
         without ever holding a colour of its own */
      --zone-a: #c9b3f0; --zone-b: #9fc3f0; --zone-c: #a9dcc6;
      --zone-d: #f0d9a4; --zone-e: #e9c2bd; --zone-box: #efb8d8;
      --seat-taken: #e2e6ee; --seat-taken-line: #c2cadb;
    }
    :root.dark .hall-plan {
      --hall-bg: #14141f; --hall-floor: #1d1d2e; --hall-line: #6b6b9c;
      --hall-hair: #40406a; --hall-ink: #d8dbee; --hall-mute: #9a9ec4;
      --hall-stage: #2a2a45; --hall-accent: #7b97ff; --hall-on-accent: #10101a;
      --zone-a: #6a54a4; --zone-b: #3f6ba6; --zone-c: #3b7f68;
      --zone-d: #8a6c34; --zone-e: #8a5450; --zone-box: #9a4f7c;
      --seat-taken: #2a2a42; --seat-taken-line: #3a3a5c;
    }
    .bg { fill: var(--hall-bg); }
    .floor { fill: var(--hall-floor); stroke: var(--hall-line); stroke-width: 2.4; }
    .stage { fill: var(--hall-stage); stroke: var(--hall-line); stroke-width: 2.4; }
    .stage-text {
      font: 600 20px/1 system-ui, sans-serif; fill: var(--hall-mute);
      text-anchor: middle; letter-spacing: 0.28em;
    }
    .rail { stroke: var(--hall-hair); stroke-width: 2; fill: none; }
    .row-no {
      font: 500 11px/1 var(--vp-font-family-mono, ui-monospace), monospace;
      fill: var(--hall-mute); text-anchor: middle;
    }
    .box-no, .sector-no {
      font: 600 12px/1 system-ui, sans-serif; fill: var(--hall-mute);
      text-anchor: middle; letter-spacing: 0.16em;
    }
    .sector-no { font-size: 13px; }
    .box-shell { fill: none; stroke: var(--hall-hair); stroke-width: 1.6; }
    /*
     * Zone colours are a property of the seat, not a state — a seat never
     * changes price band. They are declared through :where() so they carry zero
     * specificity and the states the application applies always win.
     */
    :where(#seats) :where(.seat) { stroke: var(--hall-line); stroke-width: 1; }
    :where(#seats) :where(.zone-a) { fill: var(--zone-a); }
    :where(#seats) :where(.zone-b) { fill: var(--zone-b); }
    :where(#seats) :where(.zone-c) { fill: var(--zone-c); }
    :where(#seats) :where(.zone-d) { fill: var(--zone-d); }
    :where(#seats) :where(.zone-e) { fill: var(--zone-e); }
    :where(#seats) :where(.zone-box) { fill: var(--zone-box); }
  </style>

  <g id="background">
    <rect class="bg" width="${W}" height="${H}" />
    <path class="stage" d="${STAGE}" />
    <text class="stage-text" x="${CX}" y="105">STAGE</text>
${sectorLabel('S T A L L S', 226)}
${sectorLabel('A M P H I T H E A T R E', 676)}
${sectorLabel('B A L C O N Y', 854)}
    <line class="rail" x1="300" y1="688" x2="1300" y2="688" />
    <line class="rail" x1="280" y1="866" x2="1320" y2="866" />
${boxShells}
${rowLabels.join('\n')}
  </g>

  <!--
    Sector extents. Not a declared layer, so the core never sees them; they are
    here for focusElement(), which flies the view to whatever box an id resolves
    to. pointer-events: none keeps them out of the way of the seats below.
  -->
  <g id="sectors" pointer-events="none" fill="none">
${[...bounds.entries()]
  .map(
    ([title, box]) =>
      `    <rect id="sec-${title.toLowerCase()}" x="${r1(box.x0)}" y="${r1(box.y0)}" width="${r1(box.x1 - box.x0)}" height="${r1(box.y1 - box.y0)}" />`,
  )
  .join('\n')}
  </g>

  <g id="seats">
${svgRows.join('\n')}
${boxMarkup}
  </g>
</svg>
`

// -------------------------------------------------------------------- write

const ts = `/**
 * Generated by \`scripts/gen-theatre.mjs\` — do not edit by hand.
 *
 * One record per seat in \`public/svgs/theatre.svg\`, in the order they are drawn.
 * Prices, sessions and everything else the application needs live in
 * \`theatre.ts\`, which builds on this list.
 */
export interface SeatShape {
  id: string
  sector: string
  row: number
  number: number
  zone: string
  /** Side of the aisles: seats in different blocks are not sitting together */
  block: string
}

export const SEATS: SeatShape[] = [
${seats.map((s) => `  { id: '${s.id}', sector: '${s.sector}', row: ${s.row}, number: ${s.number}, zone: '${s.zone}', block: '${s.block}' },`).join('\n')}
]
`

writeFileSync(`${SVG_DIR}/theatre.svg`, svg)
writeFileSync(`${DATA_DIR}/seats.generated.ts`, ts)

const bySector = {}

for (const seat of seats) bySector[seat.sector] = (bySector[seat.sector] ?? 0) + 1

console.log('written', `${SVG_DIR}/theatre.svg`, 'and', `${DATA_DIR}/seats.generated.ts`)
console.log(`${seats.length} seats:`, bySector)
