<template>
  <div class="tk">
    <div class="tk__main">
      <div class="tk__shows">
        <button
          v-for="show in SESSIONS"
          :key="show.id"
          :class="{ active: show.id === sessionId }"
          @click="setSession(show.id)"
        >
          <span class="tk__day">{{ show.day }}</span>
          <span class="tk__time">{{ show.time }}<em v-if="show.note"> · {{ show.note }}</em></span>
        </button>
      </div>

      <div class="tk__bar">
        <span class="tk__stat">
          <strong>{{ freeCount }}</strong> of {{ SEATS.length }} seats free
        </span>
        <div class="tk__jump">
          <button v-for="sector in SECTORS" :key="sector" @click="jump(sector)">{{ sector }}</button>
          <button @click="reset">Whole hall</button>
        </div>
        <div class="tk__zoom">
          <button aria-label="Zoom out" @click="step(1 / 1.4)">−</button>
          <button aria-label="Zoom in" @click="step(1.4)">+</button>
        </div>
      </div>

      <div ref="containerRef" class="tk__canvas" />

      <div class="tk__legend">
        <span v-for="zone in ZONES" :key="zone.id" class="tk__zone">
          <i :class="`zone-${zone.id}`" />{{ zone.title }} · {{ money(zone.price) }}
        </span>
        <span class="tk__zone"><i class="zone-sold" />Sold</span>
      </div>
    </div>

    <aside class="tk__side">
      <div class="tk__panel">
        <h4>Seats together</h4>
        <div class="tk__together">
          <button
            v-for="size in [1, 2, 3, 4]"
            :key="size"
            :class="{ active: together === size }"
            @click="setTogether(size)"
          >
            {{ size }}
          </button>
          <span v-if="together > 1" class="tk__runs">{{ candidates.length }} found</span>
        </div>

        <h4>Budget</h4>
        <select v-model.number="budget" aria-label="Budget per seat">
          <option :value="0">Any price</option>
          <option v-for="zone in ZONES.slice().reverse()" :key="zone.id" :value="zone.price">
            up to {{ money(zone.price) }}
          </option>
        </select>

        <button class="tk__best" :disabled="!offer" @click="takeOffer">
          {{ offer ? `Best ${together > 1 ? together + ' together' : 'seat'} — ${offerLabel}` : 'Nothing matches' }}
        </button>
      </div>

      <div class="tk__panel tk__basket">
        <h4>Your seats <span v-if="picked.length">{{ picked.length }}/{{ MAX_SEATS }}</span></h4>

        <template v-if="held">
          <p class="tk__held">
            Held for 10 minutes. This is a demo, so nothing is charged and nothing is sent.
          </p>
          <button class="tk__again" @click="startOver">Start over</button>
        </template>

        <template v-else-if="picked.length">
          <div v-for="seat in pickedSeats" :key="seat.id" class="tk__ticket">
            <span class="tk__ticket-seat">{{ seat.title }}</span>
            <span class="tk__ticket-zone">{{ seat.sector }}</span>
            <span class="tk__ticket-price">{{ money(seat.price) }}</span>
            <button aria-label="Remove" @click="drop(seat.id)">×</button>
          </div>
          <div class="tk__total">
            <span>Total</span>
            <strong>{{ money(total) }}</strong>
          </div>
          <div class="tk__actions">
            <button class="tk__buy" @click="hold">Hold {{ picked.length }}</button>
            <button class="tk__link" @click="copyLink">{{ copied ? 'Copied' : 'Copy link' }}</button>
          </div>
        </template>

        <p v-else class="tk__empty">
          Click a seat on the plan. Ask for two or three together and the hall shows you
          every run that would work.
        </p>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'
import type { ZoomPluginInstance } from '@svgic/core/plugins/zoom'
import {
  SEATS,
  SEAT_BY_ID,
  SESSIONS,
  ZONES,
  MAX_SEATS,
  bestRun,
  money,
  planSrc,
  runsOf,
  soldFor,
  zoneOf,
  type Seat,
} from '../../data/theatre'

const SECTORS = ['Stalls', 'Amphitheatre', 'Balcony']

const containerRef = ref<HTMLElement>()
const sessionId = ref(SESSIONS[0]!.id)
const together = ref(1)
const budget = ref(0)
const picked = ref<string[]>([])
const held = ref(false)
const copied = ref(false)
const narrow = ref(false)

let client: Svgic | null = null
let zoom: ZoomPluginInstance | null = null
let media: MediaQueryList | null = null

const sold = computed(() => soldFor(sessionId.value))
const pickedSet = computed(() => new Set(picked.value))
const pickedSeats = computed(() => picked.value.map((id) => SEAT_BY_ID.get(id)!))
const total = computed(() => pickedSeats.value.reduce((sum, seat) => sum + seat.price, 0))
const freeCount = computed(() => SEATS.length - sold.value.size)

const affordable = (seat: Seat) => budget.value === 0 || seat.price <= budget.value

/**
 * Every run of the requested size that is free, unclaimed and inside the budget.
 *
 * The budget belongs here rather than only in the offer: asking for three
 * together under $45 is one question, and marking runs you would not buy
 * answers a different one.
 */
const candidates = computed(() =>
  together.value > 1
    ? runsOf(together.value, sold.value, pickedSet.value).filter((run) => run.every(affordable))
    : [],
)

/**
 * Which run a seat belongs to.
 *
 * A seat can sit inside several overlapping runs; the first one wins, which is
 * the leftmost — the same one a person reading the row would point at.
 */
const runOfSeat = computed(() => {
  const map = new Map<string, Seat[]>()

  for (const run of candidates.value) {
    for (const seat of run) if (!map.has(seat.id)) map.set(seat.id, run)
  }

  return map
})

const offer = computed(() => {
  const pool = together.value > 1 ? candidates.value : runsOf(1, sold.value, pickedSet.value)

  return bestRun(pool, budget.value || Infinity)
})

const offerLabel = computed(() => {
  const run = offer.value

  if (!run) return ''

  const first = run[0]!
  const where = first.sector === 'Boxes' ? `box ${first.row}` : `row ${first.row}`

  return `${first.sector.toLowerCase()}, ${where}`
})

// ------------------------------------------------------------------- basket

const add = (ids: string[]) => {
  const room = MAX_SEATS - picked.value.length
  const fresh = ids.filter((id) => !pickedSet.value.has(id)).slice(0, room)

  if (fresh.length) picked.value = [...picked.value, ...fresh]
}

const drop = (id: string) => {
  picked.value = picked.value.filter((item) => item !== id)
}

const startOver = () => {
  held.value = false
  picked.value = []
}

const hold = () => {
  held.value = true
}

const takeOffer = () => {
  const run = offer.value

  if (!run) return

  add(run.map((seat) => seat.id))
  zoom?.focusElement(run[Math.floor(run.length / 2)]!.id, { scale: narrow.value ? 4 : 3 })
}

// -------------------------------------------------------------------- popup

const renderPopup = (item: SvgicItem): HTMLElement => {
  const seat = item as Seat
  const zone = zoneOf(seat.zone)
  const box = document.createElement('div')

  box.className = 'tk-pop'

  const head = document.createElement('div')

  head.className = 'tk-pop__head'
  head.textContent = seat.title
  box.appendChild(head)

  const meta = document.createElement('div')

  meta.className = 'tk-pop__meta'
  meta.textContent = `${seat.sector} · ${zone.title}`
  box.appendChild(meta)

  const foot = document.createElement('div')

  foot.className = 'tk-pop__foot'

  const price = document.createElement('span')

  price.className = 'tk-pop__price'
  price.textContent = money(seat.price)
  foot.appendChild(price)

  const state = document.createElement('span')

  if (sold.value.has(seat.id)) {
    state.className = 'tk-pop__state sold'
    state.textContent = 'Sold'
  } else if (pickedSet.value.has(seat.id)) {
    state.className = 'tk-pop__state mine'
    state.textContent = 'In your seats'
  } else if (!affordable(seat)) {
    state.className = 'tk-pop__state over'
    state.textContent = 'Over budget'
  } else if (together.value > 1 && runOfSeat.value.has(seat.id)) {
    state.className = 'tk-pop__state run'
    state.textContent = `${together.value} together from here`
  } else {
    state.className = 'tk-pop__state free'
    state.textContent = 'Available'
  }

  foot.appendChild(state)
  box.appendChild(foot)

  return box
}

// --------------------------------------------------------------- the house

/**
 * The hall, repainted.
 *
 * Six hundred and eighty-three seats go in as four lists, and the library turns
 * each list into a class. Nothing here knows what colour a price band is — the
 * plan declares those, and the states only override what changes.
 */
const paint = () => {
  if (!client) return

  const taken: string[] = []
  const over: string[] = []

  for (const seat of SEATS) {
    if (sold.value.has(seat.id)) taken.push(seat.id)
    else if (!affordable(seat)) over.push(seat.id)
  }

  client.setHighlight('taken', taken)
  client.setHighlight('over', over)
  client.setHighlight('run', together.value > 1 ? [...runOfSeat.value.keys()] : [])
  client.setHighlight('picked', picked.value)
}

const mount = async () => {
  zoom = ZoomPlugin({ wheelMode: 'ctrl', minScale: 0.9, maxScale: 9, animate: true })

  client = new Svgic(containerRef.value!, {
    src: planSrc,
    layers: { seats: { role: 'interactive' } },
    data: SEATS,
    plugins: [zoom],
    popup: {
      placement: 'cursor',
      offset: { x: 16, y: 16 },
      render: renderPopup,
    },
    style: {
      default: { cursor: 'pointer', transition: 'fill 0.12s, stroke 0.12s' },
      highlightedHover: { stroke: 'var(--hall-accent)', strokeWidth: 2 },
      /*
       * Order is the priority: a later state wins on the properties it sets.
       * "sold" has to beat the budget dimming, and a seat you have chosen has
       * to beat everything.
       */
      states: {
        over: { opacity: 0.28 },
        run: { stroke: 'var(--hall-accent)', strokeWidth: 1.8 },
        taken: {
          fill: 'var(--seat-taken)',
          stroke: 'var(--seat-taken-line)',
          strokeWidth: 1,
          cursor: 'default',
          opacity: 1,
        },
        picked: {
          fill: 'var(--hall-accent)',
          stroke: 'var(--hall-accent)',
          strokeWidth: 2,
          opacity: 1,
        },
      },
    },
  })

  await client.ready

  client.on('click', (id) => {
    if (!id) return

    const seat = SEAT_BY_ID.get(id)

    if (!seat || sold.value.has(id)) return

    if (pickedSet.value.has(id)) {
      drop(id)
      return
    }

    const run = together.value > 1 ? runOfSeat.value.get(id) : null

    add(run ? run.map((item) => item.id) : [id])
  })

  paint()
}

// ---------------------------------------------------------------- controls

const setSession = (id: string) => {
  if (id === sessionId.value) return

  sessionId.value = id
  // Seats are sold per performance, so a basket cannot survive the change
  picked.value = []
  held.value = false
}

const setTogether = (size: number) => {
  together.value = size
}

const jump = (sector: string) => {
  zoom?.focusElement(`sec-${sector.toLowerCase()}`, { scale: sector === 'Stalls' ? 2 : 2.6 })
}

const step = (factor: number) => {
  const scale = (zoom?.getState().scale ?? 1) * factor

  zoom?.zoomTo(Math.min(9, Math.max(0.9, scale)))
}

const reset = () => zoom?.reset()

// ------------------------------------------------------------------- links

const syncUrl = () => {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)

  url.searchParams.set('show', sessionId.value)

  if (picked.value.length) url.searchParams.set('seats', picked.value.join(','))
  else url.searchParams.delete('seats')

  window.history.replaceState(null, '', url)
}

const copyLink = async () => {
  if (typeof window === 'undefined') return

  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1600)
  } catch {
    // Clipboard is blocked in some embeds; the address bar already holds the link
  }
}

const openFromUrl = () => {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  const show = url.searchParams.get('show')

  if (show && SESSIONS.some((item) => item.id === show)) sessionId.value = show

  const seats = (url.searchParams.get('seats') ?? '')
    .split(',')
    .filter((id) => SEAT_BY_ID.has(id) && !soldFor(sessionId.value).has(id))
    .slice(0, MAX_SEATS)

  if (seats.length) {
    picked.value = seats
    zoom?.focusElement(seats[0]!, { scale: narrow.value ? 4 : 3 })
  }
}

// --------------------------------------------------------------- lifecycle

watch([sessionId, budget, together, picked], () => {
  paint()
  syncUrl()
})

function onMediaChange(event: MediaQueryListEvent) {
  narrow.value = event.matches
}

onMounted(async () => {
  media = window.matchMedia('(max-width: 900px)')
  narrow.value = media.matches
  media.addEventListener('change', onMediaChange)

  await mount()
  openFromUrl()

  /*
   * A seat is 20 units wide in a 1600-unit house: on a phone that lands at four
   * pixels, which is a thing you can look at and not a thing you can tap. The
   * hall therefore opens on the stalls, and the sector buttons move you about.
   */
  if (narrow.value && !picked.value.length) jump('Stalls')
})

onUnmounted(() => {
  media?.removeEventListener('change', onMediaChange)
  client?.destroy()
})
</script>

<style scoped>
.tk {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  grid-template-areas: 'main side';
  gap: 16px;
  align-items: start;
}
.tk__main { grid-area: main; }
.tk__side { grid-area: side; display: grid; gap: 12px; }

@media (max-width: 900px) {
  .tk {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'main' 'side';
    gap: 10px;
  }
}

/* ---- performances ---- */
.tk__shows { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.tk__shows button {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  text-align: left;
  cursor: pointer;
}
.tk__shows button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}
.tk__day { font-size: 12.5px; font-weight: 600; }
.tk__time { font-size: 11px; color: var(--vp-c-text-3); font-family: var(--vp-font-family-mono); }
.tk__shows button.active .tk__time { color: var(--vp-c-brand-1); opacity: 0.8; }
.tk__time em { font-style: normal; }

/* ---- bar ---- */
.tk__bar { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.tk__stat { font-size: 12px; color: var(--vp-c-text-3); }
.tk__stat strong { color: var(--vp-c-text-1); font-family: var(--vp-font-family-mono); }
.tk__jump, .tk__zoom { display: flex; gap: 6px; }
.tk__zoom { margin-left: auto; }
.tk__bar button {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
}
.tk__bar button:hover { background: var(--vp-c-bg-mute); }
.tk__zoom button { min-width: 34px; font-family: var(--vp-font-family-mono); }

.tk__canvas {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}
.tk__canvas :deep(svg) { display: block; width: 100%; height: auto; }

/* ---- legend ---- */
.tk__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  font-size: 11.5px;
  color: var(--vp-c-text-2);
}
.tk__zone { display: inline-flex; align-items: center; gap: 6px; }
.tk__zone i {
  width: 14px;
  height: 11px;
  border-radius: 3px;
  border: 1px solid var(--vp-c-divider);
}
.tk__zone i.zone-a { background: #c9b3f0; }
.tk__zone i.zone-b { background: #9fc3f0; }
.tk__zone i.zone-c { background: #a9dcc6; }
.tk__zone i.zone-d { background: #f0d9a4; }
.tk__zone i.zone-e { background: #e9c2bd; }
.tk__zone i.zone-box { background: #efb8d8; }
.tk__zone i.zone-sold { background: #e2e6ee; }
:global(.dark) .tk__zone i.zone-a { background: #6a54a4; }
:global(.dark) .tk__zone i.zone-b { background: #3f6ba6; }
:global(.dark) .tk__zone i.zone-c { background: #3b7f68; }
:global(.dark) .tk__zone i.zone-d { background: #8a6c34; }
:global(.dark) .tk__zone i.zone-e { background: #8a5450; }
:global(.dark) .tk__zone i.zone-box { background: #9a4f7c; }
:global(.dark) .tk__zone i.zone-sold { background: #2a2a42; }

/* ---- side panels ---- */
.tk__panel {
  padding: 12px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
.tk__panel h4 {
  margin: 0 0 7px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
}
.tk__panel h4 span { float: right; font-family: var(--vp-font-family-mono); text-transform: none; }
.tk__panel h4 + h4 { margin-top: 12px; }

.tk__together { display: flex; align-items: center; gap: 6px; }
.tk__together button {
  min-width: 32px;
  padding: 5px 0;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  cursor: pointer;
}
.tk__together button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}
.tk__runs { font-size: 11px; color: var(--vp-c-text-3); margin-left: 2px; }

.tk__panel select {
  width: 100%;
  padding: 7px 9px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.tk__best {
  width: 100%;
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-brand-1);
  background: transparent;
  color: var(--vp-c-brand-1);
  font-size: 12.5px;
  cursor: pointer;
}
.tk__best:disabled { border-color: var(--vp-c-divider); color: var(--vp-c-text-3); cursor: not-allowed; }

/* ---- basket ---- */
.tk__ticket {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 2px 8px;
  padding: 5px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
.tk__ticket-seat { font-size: 12.5px; font-weight: 600; }
.tk__ticket-zone { grid-column: 1; font-size: 11px; color: var(--vp-c-text-3); }
.tk__ticket-price {
  grid-row: 1 / span 2;
  grid-column: 2;
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
}
.tk__ticket button {
  grid-row: 1 / span 2;
  grid-column: 3;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.tk__ticket button:hover { color: var(--vp-c-danger-1, #cf5555); }

.tk__total { display: flex; justify-content: space-between; align-items: baseline; margin: 10px 0; font-size: 12.5px; }
.tk__total strong { font-size: 16px; font-family: var(--vp-font-family-mono); }
.tk__actions { display: flex; gap: 8px; align-items: center; }
.tk__buy {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
}
.tk__link {
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-3);
  border-radius: 99px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
}
.tk__link:hover { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); }
.tk__empty, .tk__held { margin: 0; font-size: 12.5px; color: var(--vp-c-text-3); }
.tk__again {
  margin-top: 10px;
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12.5px;
  cursor: pointer;
}
</style>

<!--
  The popup is mounted on document.body by the library, so its styles cannot be
  scoped to this component — a scoped rule would never reach it.
-->
<style>
.tk-pop {
  position: absolute;
  z-index: 60;
  width: max-content;
  padding: 8px 11px 9px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg-elv, var(--vp-c-bg));
  box-shadow: 0 6px 22px rgb(0 0 0 / 22%);
  color: var(--vp-c-text-1);
  /* It follows the cursor, so it must never be under it */
  pointer-events: none;
}
.tk-pop__head { font-weight: 600; font-size: 13px; }
.tk-pop__meta { margin-top: 1px; font-size: 11px; color: var(--vp-c-text-3); }
.tk-pop__foot { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.tk-pop__price { font-family: var(--vp-font-family-mono); font-size: 13px; }
.tk-pop__state {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 99px;
  border: 1px solid currentColor;
  font-size: 10.5px;
}
.tk-pop__state.free { color: #2f9e5a; }
.tk-pop__state.run { color: var(--vp-c-brand-1); }
.tk-pop__state.mine { color: var(--vp-c-brand-1); }
.tk-pop__state.sold { color: #cf5555; }
.tk-pop__state.over { color: var(--vp-c-text-3); }
:root.dark .tk-pop__state.free { color: #4cbd7d; }
:root.dark .tk-pop__state.sold { color: #e07a7a; }
</style>
