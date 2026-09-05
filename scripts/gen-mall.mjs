/**
 * Generates the multi-floor mall plan used by the showcase.
 *
 * Run: node scripts/gen-mall.mjs docs/public/svgs
 *
 * Shaped by a review against real mall directories:
 *  - units are plain rectangles in continuous runs; the gallery steps back
 *    around an atrium instead of shops being cut into wedges;
 *  - fixtures sit in the gallery, never on a tenant's area;
 *  - vertical cores are declared once and shared by every floor, so a route can
 *    change level through the same coordinates. The `nav` layer carries that
 *    graph, including the vertical links, for a routing plugin to read.
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

const SHELL = [
  [104, 150], [1262, 132], [1496, 268], [1496, 742],
  [1180, 782], [318, 782], [104, 640],
]

const shellPath = SHELL.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + ' Z'

/** Height of the perimeter wall above or below a given x */
const wallY = (x, side) => {
  const edges =
    side === 'north'
      ? [[104, 150, 1262, 132], [1262, 132, 1496, 268]]
      : [[104, 640, 318, 782], [318, 782, 1180, 782], [1180, 782, 1496, 742]]

  for (const [x0, y0, x1, y1] of edges) {
    if (x >= Math.min(x0, x1) && x <= Math.max(x0, x1)) {
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
    }
  }

  return side === 'north' ? 150 : 782
}

const SPINE = { x0: 250, x1: 1392, y0: 398, y1: 502 }
const CROSS = [
  { x0: 250, x1: 344, y0: 150, y1: 782 },
  { x0: 1298, x1: 1392, y0: 150, y1: 782 },
]

const ATRIA = [
  { id: 'atrium-a', cx: 600, cy: 450, r: 92 },
  { id: 'atrium-b', cx: 1060, cy: 450, r: 84 },
]

/** Identical on every floor — this is what lets a route step between levels */
const CORES = [
  { id: 'esc-a', kind: 'escalator', x: 600, y: 336, w: 152, h: 46 },
  { id: 'esc-b', kind: 'escalator', x: 1060, y: 564, w: 140, h: 46 },
  { id: 'lift-a', kind: 'lift', x: 297, y: 336, w: 50, h: 50 },
  { id: 'lift-b', kind: 'lift', x: 1345, y: 336, w: 50, h: 50 },
  { id: 'stair-a', kind: 'stair', x: 297, y: 574, w: 56, h: 48 },
  { id: 'stair-b', kind: 'stair', x: 1345, y: 574, w: 56, h: 48 },
]

/** Where the gallery steps back to clear an atrium */
const SETBACK = [
  { x0: 470, x1: 730, north: 292, south: 502 },
  { x0: 930, x1: 1190, north: 398, south: 608 },
]

const setbackAt = (x, side) => {
  for (const s of SETBACK) if (x >= s.x0 && x < s.x1) return s[side]

  return side === 'north' ? SPINE.y0 : SPINE.y1
}

/** Entrances sit where a cross gallery meets the perimeter wall */
const ENTRANCES = [
  { num: 1, x: 297, side: 'north' },
  { num: 2, x: 297, side: 'south' },
  { num: 3, x: 1345, side: 'north' },
  { num: 4, x: 1345, side: 'south' },
]

// ------------------------------------------------------------------- units

const run = (x0, x1, side, back, widths, start) => {
  const total = widths.reduce((a, b) => a + b, 0)
  const out = []
  let x = x0
  let no = start

  for (const w of widths) {
    const wx = ((x1 - x0) * w) / total
    const front = setbackAt(x + wx / 2, side)
    const y0 = side === 'north' ? back : front
    const y1 = side === 'north' ? front : back

    out.push({ id: `u-${no++}`, d: `M${r1(x)} ${r1(y0)} H${r1(x + wx)} V${r1(y1)} H${r1(x)} Z` })
    x += wx
  }

  return out
}

const FLOORS = [
  {
    level: 1,
    anchors: [
      { id: 'a-101', d: 'M104 150 L250 150 L250 398 L104 398 Z' },
      { id: 'a-102', d: 'M1392 150 L1262 132 L1496 268 L1496 398 L1392 398 Z' },
      { id: 'a-103', d: 'M104 640 L104 502 L250 502 L250 782 L318 782 Z' },
    ],
    north: { x0: 344, x1: 1298, back: 196, widths: [1.35, 1, 1.2, 0.9, 1.3, 1, 1.15, 0.95] },
    south: { x0: 344, x1: 1298, back: 736, widths: [1.25, 1, 1.15, 1.35, 0.9, 1.2, 1] },
    kiosks: [
      { id: 'k-101', x: 420, y: 450 }, { id: 'k-102', x: 800, y: 424 },
      { id: 'k-103', x: 862, y: 478 }, { id: 'k-104', x: 1240, y: 450 },
    ],
    badges: [
      { x: 400, y: 480, icon: 'human-male-female' },
      { x: 762, y: 478, icon: 'atm' },
      { x: 918, y: 424, icon: 'information-variant' },
      { x: 1252, y: 412, icon: 'atm' },
    ],
  },
  {
    level: 2,
    anchors: [
      { id: 'a-201', d: 'M104 150 L250 150 L250 470 L104 470 Z' },
      { id: 'a-202', d: 'M1392 150 L1262 132 L1496 268 L1496 470 L1392 470 Z' },
    ],
    north: { x0: 344, x1: 1298, back: 196, widths: [1.2, 1, 1.3, 0.95, 1.15, 1, 1.25] },
    south: { x0: 344, x1: 1298, back: 736, widths: [1, 1.3, 1.1, 0.95, 1.25, 1, 1.15] },
    kiosks: [
      { id: 'k-201', x: 430, y: 450 }, { id: 'k-202', x: 820, y: 470 },
      { id: 'k-203', x: 1230, y: 450 },
    ],
    badges: [
      { x: 396, y: 418, icon: 'human-male-female' },
      { x: 782, y: 424, icon: 'atm' },
      { x: 1258, y: 480, icon: 'wheelchair-accessibility' },
    ],
  },
  {
    level: 3,
    anchors: [
      { id: 'a-301', d: 'M104 150 L560 150 L560 398 L104 398 Z' },
      { id: 'a-302', d: 'M318 782 L1180 782 L1180 610 L318 610 Z' },
    ],
    north: { x0: 600, x1: 1298, back: 196, widths: [1.25, 1, 1.2, 1.1] },
    south: { x0: 1180, x1: 1298, back: 736, widths: [1] },
    kiosks: [{ id: 'k-301', x: 860, y: 450 }],
    badges: [
      { x: 420, y: 470, icon: 'human-male-female' },
      { x: 1252, y: 424, icon: 'information-variant' },
      { x: 700, y: 660, icon: 'food-fork-drink' },
    ],
  },
]

// ---------------------------------------------------------------- fixtures

const coreMarkup = CORES.map((c) => {
  const x = -c.w / 2
  const y = -c.h / 2
  let inner = ''

  if (c.kind === 'escalator') {
    const bars = []

    for (let i = 1; i < 7; i++) bars.push(`M${r1(x + (c.w * i) / 7)} ${r1(y + 5)} V${r1(y + c.h - 5)}`)

    inner =
      `<path class="core-line" d="${bars.join(' ')}" />` +
      `<path class="core-arrow" d="M${r1(x + 18)} ${r1(y + 13)} L${r1(x + c.w - 18)} 0 L${r1(x + 18)} ${r1(y + c.h - 13)}" />`
  } else {
    inner = icon(c.kind === 'lift' ? 'elevator' : 'stairs', 0, 0, c.kind === 'lift' ? 30 : 28, 'core-icon')
  }

  return `    <g id="core-${c.id}" class="core" data-kind="${c.kind}" transform="translate(${c.x} ${c.y})">
      <rect x="${r1(x)}" y="${r1(y)}" width="${c.w}" height="${c.h}" rx="4" />
      ${inner}
    </g>`
}).join('\n')

/**
 * An entrance is an opening in the wall plus a numbered tag outside it, rather
 * than a bare circle floating next to the building.
 */
const entranceMarkup = ENTRANCES.map((e) => {
  const y = wallY(e.x, e.side)
  const out = e.side === 'north' ? -1 : 1
  const tagY = y + out * 44

  return `    <g id="entrance-${e.num}" class="entrance">
      <rect class="opening" x="${e.x - 34}" y="${r1(y - 7)}" width="68" height="14" rx="3" />
      ${icon('door-sliding', e.x, r1(y + out * 22), 21, 'ent-icon')}
      <g transform="translate(${e.x} ${r1(tagY)})">
        <rect class="ent-tag" x="-42" y="-13" width="84" height="26" rx="13" />
        <text class="ent-text" y="1">Entrance ${e.num}</text>
      </g>
    </g>`
}).join('\n')

const galleryPath = [
  `M${SPINE.x0} ${SPINE.y0} H${SPINE.x1} V${SPINE.y1} H${SPINE.x0} Z`,
  ...CROSS.map((c) => `M${c.x0} ${c.y0} H${c.x1} V${c.y1} H${c.x0} Z`),
  ...SETBACK.map((s) => `M${s.x0} ${s.north} H${s.x1} V${s.south} H${s.x0} Z`),
].join(' ')

// -------------------------------------------------------------------- nav

const NAV = {
  nodes: [
    { id: 'n-w', x: 297, y: 450 },
    { id: 'n-w-ent-1', x: 297, y: 200 },
    { id: 'n-w-ent-2', x: 297, y: 720 },
    { id: 'n-w2', x: 430, y: 450 },
    { id: 'n-esc-a', x: 600, y: 336, core: 'esc-a' },
    { id: 'n-atr-a', x: 600, y: 450 },
    { id: 'n-mid', x: 830, y: 450 },
    { id: 'n-atr-b', x: 1060, y: 450 },
    { id: 'n-esc-b', x: 1060, y: 564, core: 'esc-b' },
    { id: 'n-e2', x: 1240, y: 450 },
    { id: 'n-e', x: 1345, y: 450 },
    { id: 'n-e-ent-3', x: 1345, y: 230 },
    { id: 'n-e-ent-4', x: 1345, y: 710 },
    { id: 'n-lift-a', x: 297, y: 366, core: 'lift-a' },
    { id: 'n-stair-a', x: 297, y: 548, core: 'stair-a' },
    { id: 'n-lift-b', x: 1345, y: 366, core: 'lift-b' },
    { id: 'n-stair-b', x: 1345, y: 548, core: 'stair-b' },
  ],
  links: [
    ['n-w-ent-1', 'n-lift-a'], ['n-lift-a', 'n-w'], ['n-w', 'n-stair-a'],
    ['n-stair-a', 'n-w-ent-2'], ['n-w', 'n-w2'], ['n-w2', 'n-atr-a'],
    ['n-atr-a', 'n-esc-a'], ['n-atr-a', 'n-mid'], ['n-mid', 'n-atr-b'],
    ['n-atr-b', 'n-esc-b'], ['n-atr-b', 'n-e2'], ['n-e2', 'n-e'],
    ['n-e-ent-3', 'n-lift-b'], ['n-lift-b', 'n-e'], ['n-e', 'n-stair-b'],
    ['n-stair-b', 'n-e-ent-4'],
  ],
}

const navMarkup = (level) => {
  const adj = Object.fromEntries(NAV.nodes.map((n) => [n.id, []]))

  for (const [a, b] of NAV.links) {
    adj[a].push(b)
    adj[b].push(a)
  }

  return NAV.nodes
    .filter((n) => level === 1 || !n.id.includes('ent'))
    .map(
      (n) =>
        `    <circle id="${n.id}" cx="${n.x}" cy="${n.y}" r="6" data-links="${adj[n.id].join(' ')}"${
          n.core ? ` data-vertical="core-${n.core}"` : ''
        } />`,
    )
    .join('\n')
}

// ------------------------------------------------------------------- build

const build = (floor) => {
  let no = floor.level * 100 + 1
  const units = [
    ...run(floor.north.x0, floor.north.x1, 'north', floor.north.back, floor.north.widths, no),
  ]

  no += floor.north.widths.length
  units.push(...run(floor.south.x0, floor.south.x1, 'south', floor.south.back, floor.south.widths, no))

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="mall-plan" data-level="${floor.level}">
  <style>
    .mall-plan {
      --plan-bg: #f4f6fa; --plan-shell: #e9edf4; --plan-walk: #ffffff;
      --plan-unit: #dde4ef; --plan-anchor: #c9d3e5; --plan-line: #94a2bd;
      --plan-hair: #b9c3d6; --plan-ink: #46506a; --plan-accent: #2f6df6;
      --plan-on-accent: #ffffff;
    }
    @media (prefers-color-scheme: dark) {
      .mall-plan {
        --plan-bg: #14141f; --plan-shell: #1d1d30; --plan-walk: #2a2a45;
        --plan-unit: #3a3a5e; --plan-anchor: #474773; --plan-line: #6b6b9c;
        --plan-hair: #4d4d78; --plan-ink: #d6d9ec; --plan-accent: #7b97ff;
        --plan-on-accent: #10101a;
      }
    }
    .bg { fill: var(--plan-bg); }
    .shell { fill: var(--plan-shell); stroke: var(--plan-line); stroke-width: 3; stroke-linejoin: round; }
    .gallery { fill: var(--plan-walk); }
    .void { fill: var(--plan-bg); stroke: var(--plan-line); stroke-width: 2.4; }
    #units path { fill: var(--plan-unit); stroke: var(--plan-line); stroke-width: 1.6; }
    #units path.anchor { fill: var(--plan-anchor); }
    #kiosks rect { fill: var(--plan-unit); stroke: var(--plan-line); stroke-width: 1.4; }
    .core rect { fill: var(--plan-walk); stroke: var(--plan-line); stroke-width: 1.8; }
    .core-line { stroke: var(--plan-hair); stroke-width: 1.2; fill: none; }
    .core-arrow { stroke: var(--plan-accent); stroke-width: 2.4; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    /* Iconify bodies carry fill="currentColor", which beats a fill on the group — so set color */
    .core-icon { color: var(--plan-ink); fill: var(--plan-ink); }
    .badge rect { fill: var(--plan-accent); }
    .badge .icon { color: var(--plan-on-accent); fill: var(--plan-on-accent); }
    .opening { fill: var(--plan-walk); stroke: var(--plan-accent); stroke-width: 2; }
    .ent-icon { color: var(--plan-accent); fill: var(--plan-accent); }
    .ent-tag { fill: var(--plan-accent); }
    .ent-text { font: 600 12px/1 system-ui, sans-serif; fill: var(--plan-on-accent); text-anchor: middle; dominant-baseline: middle; }
    #nav { visibility: hidden; }
  </style>

  <g id="background">
    <rect class="bg" width="${W}" height="${H}" />
    <path class="shell" d="${shellPath}" />
    <path class="gallery" d="${galleryPath}" />
${ATRIA.map((a) => `    <circle class="void" cx="${a.cx}" cy="${a.cy}" r="${a.r}" />`).join('\n')}
  </g>

  <g id="units">
${floor.anchors.map((a) => `    <path id="${a.id}" class="anchor" d="${a.d}" />`).join('\n')}
${units.map((u) => `    <path id="${u.id}" d="${u.d}" />`).join('\n')}
  </g>

  <g id="kiosks">
${floor.kiosks.map((k) => `    <rect id="${k.id}" x="${k.x - 25}" y="${k.y - 13}" width="50" height="26" rx="4" />`).join('\n')}
  </g>

  <g id="cores">
${coreMarkup}
  </g>

  <g id="service">
${floor.badges
  .map(
    (b) =>
      `    <g class="badge"><rect x="${b.x - 15}" y="${b.y - 13}" width="30" height="26" rx="7" />${icon(b.icon, b.x, b.y, 18)}</g>`,
  )
  .join('\n')}
${floor.level === 1 ? entranceMarkup : ''}
  </g>

  <g id="nav">
${navMarkup(floor.level)}
  </g>
</svg>
`
}

for (const floor of FLOORS) {
  const file = `${DIR}/mall-l${floor.level}.svg`

  writeFileSync(file, build(floor))
  console.log('written', file)
}
