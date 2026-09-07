/**
 * Generates the engine-room mimic used by the cooling-system showcase.
 *
 * Run: node scripts/gen-engineroom.mjs docs/public/svgs
 *
 * A ship's central cooling system, drawn the way an engine-room panel draws it:
 * seawater along the bottom, the freshwater loop above, the cooler between them.
 * Symbols are the conventional ones — a circle with a wedge is a pump, a bowtie
 * is a valve — so an engineer can read the plan without a key.
 *
 * Three layers are interactive and nothing else is:
 *  - `equipment`, the machinery you can start, stop, open and close;
 *  - `pipes`, which carry flow state rather than data of their own;
 *  - `readouts`, the instrument boxes the application writes values into.
 */
import { writeFileSync } from 'node:fs'

const W = 1600
const H = 900
const DIR = process.argv[2] ?? '.'

// ------------------------------------------------------------------ symbols

/** Centrifugal pump: a circle with the discharge wedge, turned to face the flow */
const pump = (id, x, y, turn = 0) => `
    <g id="${id}" class="unit" transform="rotate(${turn} ${x} ${y})">
      <circle cx="${x}" cy="${y}" r="26" />
      <path d="M${x - 8} ${y - 15} L${x + 20} ${y} L${x - 8} ${y + 15} Z" class="unit-mark" />
    </g>`

/** Gate valve: the bowtie every mimic panel in the world uses */
const valve = (id, x, y, vertical = false) => {
  const body = vertical
    ? `M${x - 13} ${y - 15} H${x + 13} L${x - 13} ${y + 15} H${x + 13} Z`
    : `M${x - 15} ${y - 13} V${y + 13} L${x + 15} ${y - 13} V${y + 13} Z`

  return `
    <g id="${id}" class="unit">
      <path d="${body}" />
    </g>`
}

/** Three-way control valve: a bowtie with the third port on top */
const threeWay = (id, x, y) => `
    <g id="${id}" class="unit">
      <path d="M${x - 15} ${y - 13} V${y + 13} L${x + 15} ${y - 13} V${y + 13} Z
               M${x - 13} ${y - 13} H${x + 13} L${x} ${y - 30} Z" />
    </g>`

/** Basket strainer: a body with the mesh drawn across it */
const strainer = (id, x, y) => `
    <g id="${id}" class="unit">
      <rect x="${x - 26}" y="${y - 20}" width="52" height="40" rx="5" />
      <path class="unit-mark" d="M${x - 14} ${y - 14} L${x + 14} ${y + 14} M${x + 14} ${y - 14} L${x - 14} ${y + 14}" />
    </g>`

const cooler = (id, x0, y0, x1, y1) => `
    <g id="${id}" class="unit">
      <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="8" />
      <path class="unit-mark" d="M${x0 + 24} ${y0 + 26} H${x1 - 24} M${x0 + 24} ${y0 + 52} H${x1 - 24} M${x0 + 24} ${y0 + 78} H${x1 - 24}" />
    </g>`

const tank = (id, x, y, w, h) => `
    <g id="${id}" class="unit">
      <rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="10" />
      <path class="unit-mark" d="M${x - w / 2 + 8} ${y + 6} H${x + w / 2 - 8}" />
    </g>`

/** The main engine: a block with its cylinders showing */
const engine = (id, x0, y0, x1, y1) => {
  const cylinders = []

  for (let i = 0; i < 6; i++) {
    const cx = x0 + 60 + i * 58

    cylinders.push(`<rect class="unit-mark" x="${cx - 18}" y="${y0 + 26}" width="36" height="52" rx="4" />`)
  }

  return `
    <g id="${id}" class="unit">
      <rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="10" />
      ${cylinders.join('\n      ')}
    </g>`
}

/** Sea chest: the hull opening with its grating */
const seaChest = (id, x, y) => `
    <g id="${id}" class="unit">
      <path d="M${x - 30} ${y - 22} H${x + 26} V${y + 22} H${x - 30} Z" />
      <path class="unit-mark" d="M${x - 22} ${y - 14} V${y + 14} M${x - 10} ${y - 14} V${y + 14} M${x + 2} ${y - 14} V${y + 14}" />
    </g>`

const pipe = (id, d, cls = '') => `    <path id="${id}" class="pipe ${cls}" d="${d}" />`

// ----------------------------------------------------------------- the plant

/**
 * Seawater runs along the bottom, freshwater loops above, and the central
 * cooler sits between them — the arrangement every engine-room panel uses,
 * because it puts the sea at the bottom of the page where it belongs.
 */
const PIPES = [
  // --- seawater ---
  ['pipe-sea-a', 'M130 640 H195'],
  ['pipe-sea-b', 'M130 780 H195'],
  ['pipe-sw-suction', 'M225 640 H280 M225 780 H280 M280 640 V780 M280 710 H354'],
  ['pipe-sw-discharge', 'M406 640 H470 M406 780 H470 M470 640 V780 M470 710 H544'],
  ['pipe-sw-cooler', 'M596 710 H700 V570 H740'],
  ['pipe-sw-overboard', 'M940 570 H1000 V710 H1105'],
  ['pipe-sw-sea', 'M1135 710 H1330'],

  // --- freshwater, low temperature loop ---
  ['pipe-fw-suction', 'M200 200 V470 M200 350 H274 M200 470 H274'],
  ['pipe-fw-discharge', 'M326 350 H400 M326 470 H400 M400 350 V470 M400 410 H560'],
  ['pipe-fw-bypass', 'M560 410 H1020 V470'],
  ['pipe-fw-cooler-in', 'M560 410 V500 H740'],
  ['pipe-fw-cooler-out', 'M940 500 H1020'],
  ['pipe-fw-engine', 'M1020 500 V270 H1080'],
  ['pipe-fw-return', 'M1080 200 H200'],
  ['pipe-exp', 'M640 132 V200'],
]

const EQUIPMENT = [
  seaChest('sea-a', 100, 640),
  seaChest('sea-b', 100, 780),
  valve('v-sea-a', 210, 640),
  valve('v-sea-b', 210, 780),
  pump('p-sw-1', 380, 640),
  pump('p-sw-2', 380, 780),
  strainer('f-sw', 570, 710),
  cooler('hx', 740, 470, 940, 600),
  valve('v-ob', 1120, 710),
  pump('p-fw-1', 300, 350),
  pump('p-fw-2', 300, 470),
  threeWay('v-3w', 1020, 500),
  tank('tank-exp', 640, 100, 120, 64),
  engine('eng', 1080, 160, 1480, 320),
]

const READOUTS = [
  ['ri-sea', 120, 520, 'Sea water'],
  ['ri-sw-p', 400, 556, 'SW pressure'],
  ['ri-dp', 570, 838, 'Strainer ΔP'],
  ['ri-sw-f', 860, 690, 'SW flow'],
  ['ri-fw-p', 300, 270, 'LT pressure'],
  ['ri-t-in', 880, 300, 'ME inlet'],
  ['ri-t-out', 700, 150, 'ME outlet'],
  ['ri-mix', 1180, 470, 'To cooler'],
  ['ri-load', 1280, 390, 'ME load'],
]

/** Captions that never change, so they are drawn once and left alone */
const LABELS = [
  [100, 590, 'SEA CHESTS'],
  [380, 590, 'SW COOLING PUMPS'],
  [570, 660, 'SW STRAINER'],
  [840, 448, 'CENTRAL COOLER'],
  [1120, 662, 'OVERBOARD'],
  [300, 528, 'LT COOLING PUMPS'],
  [640, 56, 'EXPANSION TANK'],
  [1280, 140, 'MAIN ENGINE'],
  [1020, 546, '3-WAY CONTROL'],
]

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="mimic">
  <style>
    .mimic {
      --m-bg: #eef1f7; --m-deck: #e3e8f1; --m-line: #8e9bb5; --m-hair: #b9c2d5;
      --m-ink: #38415a; --m-mute: #7f8aa5; --m-unit: #ffffff; --m-mark: #6d7893;
      --m-pipe: #b6bfd2; --m-accent: #2f6df6; --m-on-accent: #ffffff;
      --m-run: #2f9e5a; --m-warn: #cf8a28; --m-alarm: #cf3b3b; --m-shut: #9aa4bb;
      --m-sea: #cddcea;
    }
    :root.dark .mimic {
      --m-bg: #12121c; --m-deck: #1a1a29; --m-line: #6b6b9c; --m-hair: #3d3d63;
      --m-ink: #d8dbee; --m-mute: #939ac0; --m-unit: #23233a; --m-mark: #8f97bd;
      --m-pipe: #3d3d63; --m-accent: #7b97ff; --m-on-accent: #10101a;
      --m-run: #4cbd7d; --m-warn: #d9a24a; --m-alarm: #e56a6a; --m-shut: #5c6484;
      --m-sea: #1b2b3d;
    }
    .bg { fill: var(--m-bg); }
    .sea { fill: var(--m-sea); }
    .deck { fill: none; stroke: var(--m-hair); stroke-width: 1.6; stroke-dasharray: 8 7; }
    .tag {
      font: 500 11px/1 var(--vp-font-family-mono, ui-monospace), monospace;
      fill: var(--m-mute); text-anchor: middle;
    }
    .label {
      font: 600 11px/1 system-ui, sans-serif; fill: var(--m-mute);
      text-anchor: middle; letter-spacing: 0.14em;
    }
    /*
     * Everything the application repaints is declared through :where(), so the
     * defaults carry zero specificity. A plain "#pipes path" rule would be
     * (1,0,1) and would quietly beat the class the library puts on a highlighted
     * element, leaving setHighlight() with nothing to show for itself.
     */
    :where(#pipes) :where(.pipe) {
      fill: none; stroke: var(--m-pipe); stroke-width: 7;
      stroke-linecap: round; stroke-linejoin: round;
    }
    :where(#equipment) :where(g) > :where(rect, circle, path) {
      fill: var(--m-unit); stroke: var(--m-line); stroke-width: 2;
    }
    :where(#equipment) :where(g) > :where(.unit-mark) {
      fill: none; stroke: var(--m-mark); stroke-width: 2;
    }
    :where(#readouts) :where(.readout) {
      fill: var(--m-unit); stroke: var(--m-line); stroke-width: 1.6;
    }
    /*
     * Motion belongs to the file, colour to the config: the library says which
     * pipes are flowing by adding a class, and the dashes are this drawing's
     * own way of showing it.
     */
    @keyframes mimic-flow { to { stroke-dashoffset: -28; } }
    :where(#pipes) .svgic-state-flow {
      stroke-dasharray: 16 12;
      animation: mimic-flow 0.9s linear infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      :where(#pipes) .svgic-state-flow { animation: none; }
    }
  </style>

  <g id="background">
    <rect class="bg" width="${W}" height="${H}" />
    <rect class="sea" y="828" width="${W}" height="72" />
    <path class="deck" d="M40 40 H1560 V828 H40 Z" />
${LABELS.map(([x, y, text]) => `    <text class="label" x="${x}" y="${y}">${text}</text>`).join('\n')}
${READOUTS.map(([, x, y, caption]) => `    <text class="tag" x="${x}" y="${y - 26}">${caption}</text>`).join('\n')}
  </g>

  <g id="pipes">
${PIPES.map(([id, d]) => pipe(id, d)).join('\n')}
  </g>

  <g id="equipment">${EQUIPMENT.join('\n')}
  </g>

  <g id="readouts">
${READOUTS.map(([id, x, y]) => `    <rect id="${id}" class="readout" x="${x - 54}" y="${y - 19}" width="108" height="38" rx="7" />`).join('\n')}
  </g>
</svg>
`

writeFileSync(`${DIR}/engineroom.svg`, svg)
console.log(
  'written',
  `${DIR}/engineroom.svg`,
  `— ${PIPES.length} pipe runs, ${EQUIPMENT.length} units, ${READOUTS.length} instruments`,
)
