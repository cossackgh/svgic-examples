/**
 * Generates the office floor plan used by the meeting-room showcase.
 *
 * Run: node scripts/gen-office.mjs docs/public/svgs
 *
 * A single level of a meeting floor: a corridor loop around the core, rooms
 * along the facade, phone booths standing in the corridor. Only two layers are
 * interactive — `rooms` and `booths` — everything else is drawn once and never
 * touched by the application.
 *
 * Facility icons come from Material Design Icons (Apache-2.0) via
 * @iconify-json/mdi and are inlined at generation time — no runtime dependency.
 */
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const mdi = require('@iconify-json/mdi/icons.json')

const W = 1600
const H = 900
const DIR = process.argv[2] ?? '.'
const r1 = (n) => Math.round(n * 10) / 10

// ------------------------------------------------------------------- icons

/** Inlines an MDI icon centred on (x, y) at the given size */
const icon = (name, x, y, size, cls = 'icon') => {
  const def = mdi.icons[name]

  if (!def) throw new Error(`icon not found: ${name}`)

  const grid = def.height ?? mdi.height ?? 24
  const scale = size / grid

  return `<g class="${cls}" transform="translate(${r1(x - size / 2)} ${r1(y - size / 2)}) scale(${r1(scale * 1000) / 1000})">${def.body}</g>`
}

// ---------------------------------------------------------------- geometry

/** Slab with the north-east corner cut back — the terrace side of the building */
const SHELL = [
  [90, 80], [1290, 80], [1510, 230], [1510, 820], [90, 820],
]

const shellPath = SHELL.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + ' Z'

/** Depth of the room bands, and the corridor loop they leave behind */
const BAND = { north: 255, south: 645, west: 265, east: 1335 }
const RING = { x0: 265, x1: 1335, y0: 255, y1: 645 }
const INNER = { x0: 343, x1: 1257, y0: 333, y1: 567 }
const CORE = { x0: 700, x1: 900, y0: 333, y1: 567 }

const rect = (x0, y0, x1, y1) => `M${r1(x0)} ${r1(y0)} H${r1(x1)} V${r1(y1)} H${r1(x0)} Z`

/** Corridor: the ring minus the block it wraps around, filled even-odd */
const corridorPath = [
  rect(RING.x0, RING.y0, RING.x1, RING.y1),
  rect(INNER.x0, INNER.y0, INNER.x1, INNER.y1),
].join(' ')

const ZONES = [
  { id: 'zone-lounge', x0: INNER.x0, y0: INNER.y0, x1: CORE.x0, y1: INNER.y1, label: 'Lounge' },
  { id: 'zone-open', x0: CORE.x1, y0: INNER.y0, x1: INNER.x1, y1: INNER.y1, label: 'Open collaboration' },
]

/** The cut corner is a terrace lounge rather than a room — it has no square walls */
const TERRACE = 'M1290 80 L1510 230 L1510 255 L1290 255 Z'

// -------------------------------------------------------------------- rooms

/**
 * Splits a band into a run of rooms. Widths are relative, so the run always
 * fills the band exactly however many rooms it holds.
 */
const run = (from, to, widths, ids, fixed) => {
  const total = widths.reduce((a, b) => a + b, 0)
  const out = []
  let at = from

  widths.forEach((w, i) => {
    const size = ((to - from) * w) / total

    out.push({
      id: ids[i],
      d: fixed.horizontal
        ? rect(at, fixed.y0, at + size, fixed.y1)
        : rect(fixed.x0, at, fixed.x1, at + size),
    })
    at += size
  })

  return out
}

const ROOMS = [
  // north facade — the wide one at the west end is the boardroom
  ...run(90, 1290, [1.8, 1, 1, 1.15, 1, 1, 1.25],
    ['r-601', 'r-602', 'r-603', 'r-604', 'r-605', 'r-606', 'r-607'],
    { horizontal: true, y0: 80, y1: BAND.north }),
  // east facade
  ...run(BAND.north, BAND.south, [1, 1, 1],
    ['r-608', 'r-609', 'r-610'],
    { horizontal: false, x0: BAND.east, x1: 1510 }),
  // south facade
  ...run(90, 1510, [1.3, 1, 1, 1, 1.2, 1, 1, 1.4],
    ['r-611', 'r-612', 'r-613', 'r-614', 'r-615', 'r-616', 'r-617', 'r-618'],
    { horizontal: true, y0: BAND.south, y1: 820 }),
  // west facade
  ...run(BAND.north, BAND.south, [1, 1],
    ['r-619', 'r-620'],
    { horizontal: false, x0: 90, x1: BAND.west }),
]

/** Phone booths stand in the corridor, the way they actually do */
const BOOTHS = [
  { id: 'b-601', x: 413, y: 294 },
  { id: 'b-602', x: 1187, y: 294 },
  { id: 'b-603', x: 413, y: 606 },
  { id: 'b-604', x: 1187, y: 606 },
]

// --------------------------------------------------------------------- core

const CORE_PARTS = [
  { x0: 712, y0: 345, x1: 792, y1: 411, icon: 'elevator-passenger', label: 'lifts' },
  { x0: 802, y0: 345, x1: 888, y1: 411, icon: 'stairs', label: 'stairs' },
  { x0: 712, y0: 423, x1: 798, y1: 489, icon: 'human-male-female', label: 'restrooms' },
  { x0: 802, y0: 423, x1: 888, y1: 489, icon: 'coffee-outline', label: 'tea point' },
  { x0: 712, y0: 501, x1: 888, y1: 555, icon: 'server', label: 'utility' },
]

const coreMarkup = [
  `    <rect class="core" x="${CORE.x0}" y="${CORE.y0}" width="${CORE.x1 - CORE.x0}" height="${CORE.y1 - CORE.y0}" />`,
  ...CORE_PARTS.map((p) => {
    const cx = (p.x0 + p.x1) / 2
    const cy = (p.y0 + p.y1) / 2

    return `    <g class="core-cell" data-kind="${p.label}"><rect x="${p.x0}" y="${p.y0}" width="${p.x1 - p.x0}" height="${p.y1 - p.y0}" rx="4" />${icon(p.icon, cx, cy, 22, 'core-icon')}</g>`
  }),
  // The lift shaft is split in two, so it reads as a pair of cars
  `    <line class="core-hair" x1="752" y1="345" x2="752" y2="411" />`,
].join('\n')

/** Fixtures that sit in the corridor, never on a tenant's floor */
const FIXTURES = [
  { id: 'svc-reception', x: 640, y: 294, icon: 'card-account-details-outline', label: 'Host desk' },
  { id: 'svc-print', x: 304, y: 450, icon: 'printer-outline', label: 'Print' },
  { id: 'svc-water', x: 1296, y: 450, icon: 'water-outline', label: 'Water' },
  { id: 'svc-first-aid', x: 960, y: 294, icon: 'medical-bag', label: 'First aid' },
]

/** The floor is entered from the lift lobby, so the arrival point is fixed */
const ARRIVAL = { x: 640, y: 340 }

// ------------------------------------------------------------------- build

/**
 * Two palettes over the same variable names.
 *
 * The dark one is keyed to `html.dark` rather than `prefers-color-scheme`:
 * VitePress stamps the effective theme on the root element, so following the OS
 * would make the plan fight the site's own light/dark switch.
 */
const LIGHT = `      --plan-bg: #f2f5f9; --plan-shell: #e7ecf4; --plan-walk: #ffffff;
      --plan-zone: #edf1f8; --plan-core: #dde5f1; --plan-room: #e3e9f3;
      --plan-line: #93a1bb; --plan-hair: #b7c1d5; --plan-ink: #3f4a63;
      --plan-mute: #8c98b3; --plan-accent: #2f6df6; --plan-on-accent: #ffffff;
      /* Booking states — named here so the application can paint by status
         without knowing anything about the palette */
      --room-free: #d6efdd; --room-free-line: #2f9e5a;
      --room-soon: #fbe8cd; --room-soon-line: #cf8a28;
      --room-busy: #f6dcdc; --room-busy-line: #cf5555;
      --room-mine: #d8e3ff; --room-mine-line: #2f6df6; --room-off: #eaeef4;`

const DARK = `      --plan-bg: #14141f; --plan-shell: #1c1c2c; --plan-walk: #262640;
      --plan-zone: #1f1f36; --plan-core: #2e2e4c; --plan-room: #33335a;
      --plan-line: #6b6b9c; --plan-hair: #4b4b76; --plan-ink: #d8dbee;
      --plan-mute: #9a9ec4; --plan-accent: #7b97ff; --plan-on-accent: #10101a;
      --room-free: #24503a; --room-free-line: #4cbd7d;
      --room-soon: #4d4128; --room-soon-line: #d9a24a;
      --room-busy: #4f2f36; --room-busy-line: #e07a7a;
      --room-mine: #2f3c6e; --room-mine-line: #7b97ff; --room-off: #24243c;`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="office-plan" data-level="6">
  <style>
    .office-plan {
${LIGHT}
    }
    :root.dark .office-plan {
${DARK}
    }
    .bg { fill: var(--plan-bg); }
    .shell { fill: var(--plan-shell); stroke: var(--plan-line); stroke-width: 3; stroke-linejoin: round; }
    .walk { fill: var(--plan-walk); fill-rule: evenodd; }
    .zone { fill: var(--plan-zone); stroke: var(--plan-hair); stroke-width: 1.4; }
    .zone-text {
      font: 500 15px/1 system-ui, sans-serif; fill: var(--plan-mute);
      text-anchor: middle; dominant-baseline: middle; letter-spacing: 0.06em;
    }
    .core { fill: var(--plan-core); stroke: var(--plan-line); stroke-width: 2; }
    .core-cell rect { fill: var(--plan-walk); stroke: var(--plan-hair); stroke-width: 1.2; }
    .core-hair { stroke: var(--plan-hair); stroke-width: 1.2; }
    /* Iconify bodies carry fill="currentColor", which beats a fill on the group — so set color */
    .core-icon { color: var(--plan-ink); fill: var(--plan-ink); }
    /*
     * Defaults for anything the application may repaint are stated through
     * :where(), so they carry zero specificity. A plain "#rooms path" rule would
     * be (1,0,1) and would silently beat the class the library puts on a
     * highlighted element, leaving setHighlight() with no visible effect.
     */
    :where(#rooms) :where(path) { fill: var(--plan-room); stroke: var(--plan-line); stroke-width: 1.6; }
    :where(#booths) :where(rect) { fill: var(--plan-room); stroke: var(--plan-line); stroke-width: 1.4; }
    .fixture rect { fill: var(--plan-walk); stroke: var(--plan-hair); stroke-width: 1.2; }
    .fixture .icon { color: var(--plan-mute); fill: var(--plan-mute); }
    .arrival-halo { fill: var(--plan-accent); opacity: 0.16; }
    .arrival-dot { fill: var(--plan-accent); stroke: var(--plan-on-accent); stroke-width: 2; }
    .arrival-text {
      font: 600 12px/1 system-ui, sans-serif; fill: var(--plan-accent);
      text-anchor: middle; dominant-baseline: middle;
    }
  </style>

  <g id="background">
    <rect class="bg" width="${W}" height="${H}" />
    <path class="shell" d="${shellPath}" />
    <path class="walk" d="${corridorPath}" />
    <path class="zone" d="${TERRACE}" />
${ZONES.map(
  (z) =>
    `    <rect class="zone" x="${z.x0}" y="${z.y0}" width="${z.x1 - z.x0}" height="${z.y1 - z.y0}" />\n` +
    `    <text class="zone-text" x="${(z.x0 + z.x1) / 2}" y="${(z.y0 + z.y1) / 2}">${z.label}</text>`,
).join('\n')}
    <text class="zone-text" x="1400" y="180">Terrace</text>
  </g>

  <g id="rooms">
${ROOMS.map((r) => `    <path id="${r.id}" d="${r.d}" />`).join('\n')}
  </g>

  <g id="booths">
${BOOTHS.map((b) => `    <rect id="${b.id}" x="${b.x - 33}" y="${b.y - 26}" width="66" height="52" rx="6" />`).join('\n')}
  </g>

  <g id="core">
${coreMarkup}
  </g>

  <g id="fixtures">
${FIXTURES.map(
  (f) =>
    `    <g id="${f.id}" class="fixture" data-kind="${f.label}"><rect x="${f.x - 16}" y="${f.y - 14}" width="32" height="28" rx="7" />${icon(f.icon, f.x, f.y, 18)}</g>`,
).join('\n')}
    <g id="arrival">
      <circle class="arrival-halo" cx="${ARRIVAL.x}" cy="${ARRIVAL.y}" r="17" />
      <circle class="arrival-dot" cx="${ARRIVAL.x}" cy="${ARRIVAL.y}" r="6.5" />
      <text class="arrival-text" x="${ARRIVAL.x}" y="${ARRIVAL.y + 30}">Lift lobby</text>
    </g>
  </g>
</svg>
`

const file = `${DIR}/office-l6.svg`

writeFileSync(file, svg)
console.log('written', file, `— ${ROOMS.length} rooms, ${BOOTHS.length} booths`)
