<template>
  <div class="er">
    <div class="er__main">
      <div class="er__bar">
        <span class="er__state" :class="worst ?? 'ok'">
          {{ worst === 'alarm' ? 'Alarm' : worst === 'warning' ? 'Warning' : 'Normal' }}
        </span>
        <span class="er__clock">{{ clock }}</span>
        <button :class="{ on: controls.auto }" @click="controls.auto = !controls.auto">
          Auto {{ controls.auto ? 'on' : 'off' }}
        </button>
        <div class="er__zoom">
          <button aria-label="Zoom out" @click="step(1 / 1.4)">−</button>
          <button aria-label="Zoom in" @click="step(1.4)">+</button>
          <button @click="resetView">Fit</button>
        </div>
      </div>

      <div ref="containerRef" class="er__canvas" />

      <div class="er__under">
        <div class="er__panel">
          <h4>Alarms</h4>
          <ul v-if="alarms.length" class="er__alarms">
            <li v-for="alarm in alarms" :key="alarm.id" :class="alarm.level">
              <i />{{ alarm.text }}
            </li>
          </ul>
          <p v-else class="er__quiet">No active alarms.</p>
        </div>

        <div class="er__panel">
          <h4>Log</h4>
          <ul class="er__log">
            <li v-for="(entry, index) in log" :key="index">
              <span>{{ entry.at }}</span>{{ entry.text }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <aside class="er__side">
      <div class="er__panel">
        <h4>Machinery</h4>
        <div v-for="id in PUMPS" :key="id" class="er__row">
          <span>{{ UNITS[id].title }}</span>
          <button :class="{ on: controls.pumps[id] }" @click="togglePump(id)">
            {{ controls.pumps[id] ? 'Running' : 'Stopped' }}
          </button>
        </div>
        <div v-for="id in VALVES" :key="id" class="er__row">
          <span>{{ UNITS[id].title }}</span>
          <button :class="{ on: controls.valves[id] }" @click="toggleValve(id)">
            {{ controls.valves[id] ? 'Open' : 'Shut' }}
          </button>
        </div>
      </div>

      <div class="er__panel">
        <h4>Conditions</h4>
        <label class="er__slider">
          <span>Engine load<em>{{ Math.round(controls.load) }}%</em></span>
          <input v-model.number="controls.load" type="range" min="0" max="100" step="5" />
        </label>
        <label class="er__slider">
          <span>Sea water<em>{{ controls.seaTemp }} °C</em></span>
          <input v-model.number="controls.seaTemp" type="range" min="4" max="34" step="1" />
        </label>
        <label class="er__slider">
          <span>Strainer fouling<em>{{ Math.round(controls.fouling * 100) }}%</em></span>
          <input v-model.number="controls.fouling" type="range" min="0" max="1" step="0.05" />
        </label>
        <label v-if="!controls.auto" class="er__slider">
          <span>Three-way valve<em>{{ Math.round(plant.mix * 100) }}%</em></span>
          <input v-model.number="plant.mix" type="range" min="0" max="1" step="0.05" />
        </label>
      </div>

      <div class="er__panel">
        <h4>Try it</h4>
        <button class="er__fault" @click="foulStrainer">Foul the strainer</button>
        <button class="er__fault" @click="tripDutyPump">Trip the duty SW pump</button>
        <button class="er__fault" @click="tropical">Enter tropical water</button>
        <button class="er__reset" @click="resetPlant">Reset the plant</button>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'
import type { ZoomPluginInstance } from '@svgic/core/plugins/zoom'
import { ContentPlugin } from '@svgic/core/plugins/content'
import {
  INITIAL,
  INSTRUMENTS,
  PIPE_TITLES,
  UNITS,
  alarmsOf,
  flowingPipes,
  planSrc,
  step as advance,
  type Alarm,
  type Controls,
  type Instrument,
  type Plant,
} from '../../data/engineroom'

const SVG_NS = 'http://www.w3.org/2000/svg'
const PUMPS = ['p-sw-1', 'p-sw-2', 'p-fw-1', 'p-fw-2']
const VALVES = ['v-sea-a', 'v-sea-b', 'v-ob']

const start = (): Controls => ({
  pumps: { 'p-sw-1': true, 'p-sw-2': false, 'p-fw-1': true, 'p-fw-2': false },
  valves: { 'v-sea-a': true, 'v-sea-b': false, 'v-ob': true },
  fouling: 0,
  seaTemp: 18,
  load: 75,
  auto: true,
})

const containerRef = ref<HTMLElement>()
const controls = reactive<Controls>(start())
const plant = reactive<Plant>({ ...INITIAL })
const alarms = ref<Alarm[]>([])
const log = ref<{ at: string; text: string }[]>([])
const clock = ref('--:--:--')

let client: Svgic | null = null
let zoom: ZoomPluginInstance | null = null
let timer: number | null = null
/** Alarms present on the previous tick, so only changes reach the log */
let seen = new Map<string, string>()

const worst = computed<'alarm' | 'warning' | null>(() =>
  alarms.value.some((item) => item.level === 'alarm')
    ? 'alarm'
    : alarms.value.length
      ? 'warning'
      : null,
)

const stamp = () => new Date().toLocaleTimeString('en-GB', { hour12: false })

const note = (text: string) => {
  log.value = [{ at: stamp(), text }, ...log.value].slice(0, 7)
}

// ------------------------------------------------------------- instruments

const reading = (instrument: Instrument): string => {
  const value = instrument.value(plant, controls)

  return value.toFixed(instrument.digits ?? 0)
}

/**
 * Instrument faces.
 *
 * A `custom` candidate rather than text: the reading and its unit want two
 * different sizes, and the plugin will measure whatever this returns and fit it
 * to the box — which is the whole point of handing it an element instead of a
 * string.
 */
const face = ({ item }: { item: SvgicItem | null }): SVGElement | null => {
  if (!item || typeof item['value'] !== 'string') return null

  const text = document.createElementNS(SVG_NS, 'text')

  text.setAttribute('text-anchor', 'middle')
  text.setAttribute('dominant-baseline', 'central')

  const value = document.createElementNS(SVG_NS, 'tspan')

  value.textContent = item['value']
  value.setAttribute('font-size', '22')
  value.setAttribute('font-weight', '600')
  value.setAttribute('fill', 'var(--m-ink)')

  const unit = document.createElementNS(SVG_NS, 'tspan')

  unit.textContent = ` ${item['unit'] ?? ''}`
  unit.setAttribute('font-size', '13')
  unit.setAttribute('fill', 'var(--m-mute)')

  text.append(value, unit)

  return text
}

// -------------------------------------------------------------------- popup

const renderPopup = (item: SvgicItem): HTMLElement => {
  const box = document.createElement('div')

  box.className = 'er-pop'

  const head = document.createElement('div')

  head.className = 'er-pop__head'
  head.textContent = String(item.title ?? item.id)
  box.appendChild(head)

  const body = document.createElement('div')

  body.className = 'er-pop__body'

  const id = String(item.id)

  if (typeof item['value'] === 'string') {
    body.textContent = `${item['value']} ${item['unit'] ?? ''}`
  } else if (PIPE_TITLES[id]) {
    const seawater = id.startsWith('pipe-sw') || id.startsWith('pipe-sea')
    const rate = Math.round(seawater ? plant.swFlow : plant.fwFlow)

    body.textContent = flowing.value.has(id) ? `Flowing · ${rate} m³/h` : 'No flow'
  } else if (UNITS[id]?.kind === 'pump') {
    body.textContent = controls.pumps[id] ? 'Running · click to stop' : 'Stopped · click to start'
  } else if (UNITS[id]?.kind === 'valve') {
    body.textContent = controls.valves[id] ? 'Open · click to shut' : 'Shut · click to open'
  } else {
    body.textContent = UNITS[id]?.note ?? ''
  }

  box.appendChild(body)

  const alarm = alarms.value.find((entry) => entry.readout === id)

  if (alarm) {
    const tag = document.createElement('div')

    tag.className = `er-pop__alarm ${alarm.level}`
    tag.textContent = alarm.text
    box.appendChild(tag)
  }

  return box
}

// --------------------------------------------------------------- the plant

const flowing = computed(() => new Set(flowingPipes(plant, controls)))

/**
 * Everything the schema can be asked about, in one list bound by id.
 *
 * The readings live in here rather than in a closure the renderer reaches into:
 * the instrument faces are redrawn because the data changed, which is the thing
 * this page is meant to be showing.
 */
const data = computed<SvgicItem[]>(() => [
  ...INSTRUMENTS.map((entry) => ({
    id: entry.id,
    title: entry.title,
    unit: entry.unit,
    value: reading(entry),
  })),
  ...Object.entries(UNITS).map(([id, unit]) => ({ id, title: unit.title, note: unit.note })),
  ...Object.entries(PIPE_TITLES).map(([id, title]) => ({ id, title })),
])

/**
 * The panel, repainted.
 *
 * Six lists go to the library every second. Nothing here holds a colour: the
 * mimic declares what a running pump and a flowing pipe look like, and these
 * states only say which is which.
 */
const paint = () => {
  if (!client) return

  const running: string[] = []
  const stopped: string[] = []
  const open: string[] = []
  const shut: string[] = []

  for (const id of PUMPS) (controls.pumps[id] ? running : stopped).push(id)
  for (const id of VALVES) (controls.valves[id] ? open : shut).push(id)

  const idle = Object.keys(PIPE_TITLES).filter((id) => !flowing.value.has(id))

  client.setHighlight('running', running)
  client.setHighlight('stopped', stopped)
  client.setHighlight('open', open)
  client.setHighlight('shut', shut)
  client.setHighlight('idle', idle)
  client.setHighlight('flow', [...flowing.value])
  client.setHighlight(
    'warning',
    alarms.value.filter((item) => item.level === 'warning' && item.readout).map((item) => item.readout!),
  )
  client.setHighlight(
    'alarm',
    alarms.value.filter((item) => item.level === 'alarm' && item.readout).map((item) => item.readout!),
  )
}

/** One second of plant, then everything the panel shows about it */
const tick = () => {
  Object.assign(plant, advance(plant, controls))

  if (controls.auto) autoStart()

  const next = alarmsOf(plant, controls)
  const now = new Map(next.map((item) => [item.id, item.text]))

  for (const alarm of next) {
    if (!seen.has(alarm.id)) note(`${alarm.level === 'alarm' ? 'ALARM' : 'Warning'} — ${alarm.text}`)
  }

  for (const [id, text] of seen) if (!now.has(id)) note(`Cleared — ${text}`)

  seen = now
  alarms.value = next
  clock.value = stamp()

  client?.setData(data.value)
  paint()
}

/** Seconds each pair has been below its limit, so a dip does not start a pump */
const lowFor: Record<string, number> = {}

/**
 * What a standby pump is for.
 *
 * The pressure has to stay down for three seconds before the standby comes in —
 * a real start has a time delay on it, and without one every transient on the
 * panel would end in a pump nobody asked for.
 */
const autoStart = () => {
  const pairs: [string, string, number, number][] = [
    ['p-sw-1', 'p-sw-2', plant.swPress, 1.2],
    ['p-fw-1', 'p-fw-2', plant.fwPress, 1.5],
  ]

  for (const [first, second, pressure, limit] of pairs) {
    const one = controls.pumps[first]
    const two = controls.pumps[second]
    const key = first

    if (pressure >= limit || (one && two)) {
      lowFor[key] = 0
      continue
    }

    lowFor[key] = (lowFor[key] ?? 0) + 1

    if (lowFor[key] < 3) continue

    // The standby comes in whether the duty pump merely lost pressure or fell
    // over entirely — losing both is the case it exists for
    const standby = two ? first : second

    controls.pumps[standby] = true
    lowFor[key] = 0
    note(`${UNITS[standby].title} started automatically`)
  }
}

// ------------------------------------------------------------------ actions

const togglePump = (id: string) => {
  controls.pumps[id] = !controls.pumps[id]
  note(`${UNITS[id].title} ${controls.pumps[id] ? 'started' : 'stopped'}`)
}

const toggleValve = (id: string) => {
  controls.valves[id] = !controls.valves[id]
  note(`${UNITS[id].title} ${controls.valves[id] ? 'opened' : 'shut'}`)
}

const foulStrainer = () => {
  controls.fouling = 0.85
  note('Strainer fouled')
}

const tripDutyPump = () => {
  const duty = controls.pumps['p-sw-1'] ? 'p-sw-1' : 'p-sw-2'

  if (!controls.pumps[duty]) return

  controls.pumps[duty] = false
  note(`${UNITS[duty].title} tripped`)
}

const tropical = () => {
  controls.seaTemp = 32
  note('Sea water temperature 32 °C')
}

const resetPlant = () => {
  Object.assign(controls, start())
  Object.assign(plant, INITIAL)
  seen = new Map()
  log.value = []
  note('Plant reset')
}

// ------------------------------------------------------------------- mount

const mount = async () => {
  zoom = ZoomPlugin({ wheelMode: 'ctrl', minScale: 0.8, maxScale: 5, animate: true })

  client = new Svgic(containerRef.value!, {
    src: planSrc,
    layers: {
      equipment: { role: 'interactive' },
      pipes: { role: 'interactive' },
      readouts: { role: 'interactive' },
    },
    data: data.value,
    plugins: [
      zoom,
      ContentPlugin({
        sourceLayer: 'readouts',
        padding: 0.1,
        content: [{ type: 'custom', render: face, fit: 'scale', minScale: 0.5 }],
      }),
    ],
    popup: {
      placement: 'cursor',
      offset: { x: 16, y: 16 },
      render: renderPopup,
    },
    style: {
      // Only the machinery you can work is given a pointer, by its own states
      default: { transition: 'fill 0.2s, stroke 0.2s' },
      highlightedHover: { stroke: 'var(--m-accent)', strokeWidth: 3 },
      /*
       * Order is priority. Pipes carry flow states and machinery carries
       * running states, so the two sets never meet on one element; the alarm
       * colours come last because an instrument in alarm has to look like one
       * whatever else it is.
       */
      states: {
        idle: { stroke: 'var(--m-pipe)' },
        flow: { stroke: 'var(--m-accent)' },
        stopped: { cursor: 'pointer', fill: 'var(--m-unit)', stroke: 'var(--m-shut)' },
        running: { cursor: 'pointer', fill: 'var(--m-unit)', stroke: 'var(--m-run)', strokeWidth: 3 },
        shut: { cursor: 'pointer', fill: 'var(--m-shut)', stroke: 'var(--m-shut)' },
        open: { cursor: 'pointer', fill: 'var(--m-unit)', stroke: 'var(--m-run)', strokeWidth: 3 },
        warning: { stroke: 'var(--m-warn)', strokeWidth: 3 },
        alarm: { fill: 'var(--m-alarm)', stroke: 'var(--m-alarm)', strokeWidth: 3 },
      },
    },
  })

  await client.ready

  client.on('click', (id) => {
    if (!id) return

    if (UNITS[id]?.kind === 'pump') togglePump(id)
    if (UNITS[id]?.kind === 'valve') toggleValve(id)
  })

  paint()
}

const step = (factor: number) => {
  const scale = (zoom?.getState().scale ?? 1) * factor

  zoom?.zoomTo(Math.min(5, Math.max(0.8, scale)))
}

const resetView = () => zoom?.reset()

/** The plant only runs while the panel is on screen — a hidden tab is not a watch */
const onVisibility = () => {
  if (document.hidden) stopTimer()
  else startTimer()
}

const startTimer = () => {
  if (timer === null) timer = window.setInterval(tick, 1000)
}

const stopTimer = () => {
  if (timer !== null) window.clearInterval(timer)
  timer = null
}

onMounted(async () => {
  await mount()
  note('Panel on watch')
  tick()
  startTimer()
  document.addEventListener('visibilitychange', onVisibility)
})

onUnmounted(() => {
  stopTimer()
  document.removeEventListener('visibilitychange', onVisibility)
  client?.destroy()
})
</script>

<style scoped>
.er {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  grid-template-areas: 'main side';
  gap: 16px;
  align-items: start;
}
.er__main { grid-area: main; }
.er__side { grid-area: side; display: grid; gap: 12px; }

@media (max-width: 900px) {
  .er {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'main' 'side';
    gap: 10px;
  }
}

/* ---- bar ---- */
.er__bar { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.er__state {
  padding: 3px 10px;
  border-radius: 99px;
  border: 1px solid currentColor;
  font-size: 11.5px;
  font-weight: 600;
}
.er__state.ok { color: #2f9e5a; }
.er__state.warning { color: #cf8a28; }
.er__state.alarm { color: #cf3b3b; }
:global(.dark) .er__state.ok { color: #4cbd7d; }
:global(.dark) .er__state.alarm { color: #e56a6a; }
.er__clock { font-family: var(--vp-font-family-mono); font-size: 12px; color: var(--vp-c-text-3); }
.er__zoom { display: flex; gap: 6px; margin-left: auto; }
.er__bar button {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
}
.er__bar button.on { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.er__zoom button { min-width: 34px; font-family: var(--vp-font-family-mono); }

.er__canvas {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}
.er__canvas :deep(svg) { display: block; width: 100%; height: auto; }

/* ---- panels ---- */
.er__panel {
  padding: 12px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
.er__panel h4 {
  margin: 0 0 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
}
.er__under { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
@media (max-width: 720px) { .er__under { grid-template-columns: 1fr; } }

.er__alarms, .er__log { list-style: none; margin: 0; padding: 0; }
.er__alarms li { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding: 2px 0; }
.er__alarms i { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.er__alarms li.warning i { background: #cf8a28; }
.er__alarms li.alarm i { background: #cf3b3b; }
.er__alarms li.alarm { color: #cf3b3b; }
:global(.dark) .er__alarms li.alarm { color: #e56a6a; }
:global(.dark) .er__alarms li.alarm i { background: #e56a6a; }
.er__quiet { margin: 0; font-size: 12.5px; color: var(--vp-c-text-3); }
.er__log li { font-size: 11.5px; color: var(--vp-c-text-2); padding: 1px 0; }
.er__log span {
  display: inline-block;
  width: 66px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}

/* ---- side ---- */
.er__row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 12.5px; }
.er__row span { flex: 1; }
.er__row button {
  min-width: 74px;
  padding: 3px 8px;
  border-radius: 99px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-3);
  font-size: 11px;
  cursor: pointer;
}
.er__row button.on { border-color: #2f9e5a; color: #2f9e5a; }
:global(.dark) .er__row button.on { border-color: #4cbd7d; color: #4cbd7d; }

.er__slider { display: block; margin-bottom: 10px; }
.er__slider span {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-bottom: 3px;
}
.er__slider em { font-style: normal; font-family: var(--vp-font-family-mono); color: var(--vp-c-text-3); }
.er__slider input { width: 100%; accent-color: var(--vp-c-brand-1); }

.er__fault, .er__reset {
  display: block;
  width: 100%;
  margin-bottom: 6px;
  padding: 7px 10px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
}
.er__fault:hover { border-color: #cf8a28; color: #cf8a28; }
.er__reset { margin-top: 4px; margin-bottom: 0; text-align: center; }
.er__reset:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
</style>

<!--
  The popup is mounted on document.body by the library, so its styles cannot be
  scoped to this component — a scoped rule would never reach it.
-->
<style>
.er-pop {
  position: absolute;
  z-index: 60;
  width: max-content;
  max-width: 240px;
  padding: 8px 11px 9px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg-elv, var(--vp-c-bg));
  box-shadow: 0 6px 22px rgb(0 0 0 / 22%);
  color: var(--vp-c-text-1);
  /* It follows the cursor, so it must never be under it */
  pointer-events: none;
}
.er-pop__head { font-weight: 600; font-size: 13px; }
.er-pop__body { margin-top: 2px; font-size: 11.5px; color: var(--vp-c-text-3); }
.er-pop__alarm { margin-top: 6px; font-size: 11px; }
.er-pop__alarm.warning { color: #cf8a28; }
.er-pop__alarm.alarm { color: #cf3b3b; }
:root.dark .er-pop__alarm.alarm { color: #e56a6a; }
</style>
