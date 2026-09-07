<template>
  <div class="rb" :class="{ filtering }">
    <aside class="rb__side">
      <div class="rb__filters">
        <label class="rb__field">
          <span>People</span>
          <select v-model.number="minSeats">
            <option :value="0">Any size</option>
            <option :value="2">2 or more</option>
            <option :value="4">4 or more</option>
            <option :value="6">6 or more</option>
            <option :value="10">10 or more</option>
          </select>
        </label>

        <div class="rb__needs">
          <button
            v-for="item in EQUIPMENT"
            :key="item.key"
            :class="{ on: needs.includes(item.key) }"
            :title="EQUIPMENT_LABEL[item.key]"
            :aria-pressed="needs.includes(item.key)"
            @click="toggleNeed(item.key)"
          >
            <span class="rb__icon" v-html="item.svg" />
            {{ EQUIPMENT_LABEL[item.key] }}
          </button>
        </div>
      </div>

      <ul class="rb__list">
        <li v-if="!listed.length" class="rb__empty">No room matches those filters</li>
        <li v-for="room in listed" :key="room.id">
          <button :class="{ active: selectedId === room.id }" @click="goTo(room)">
            <span class="rb__dot" :class="dotClass(room)" />
            <span class="rb__name">{{ room.title }}</span>
            <span class="rb__seats">{{ room.seats }}</span>
            <span class="rb__note">{{ describeLong(dayOf[room.id], from) }}</span>
          </button>
        </li>
      </ul>

      <div v-if="bookings.length" class="rb__mine">
        <h4>Your bookings</h4>
        <div v-for="(booking, index) in bookings" :key="index" class="rb__booking">
          <span>{{ titleOf(booking.room) }}</span>
          <span class="rb__booking-time">{{ fmtRange(booking.slot) }}</span>
          <button aria-label="Cancel booking" @click="cancel(index)">×</button>
        </div>
      </div>
    </aside>

    <div class="rb__main">
      <div class="rb__when">
        <div class="rb__clock">
          <strong>{{ fmtRange(slot) }}</strong>
          <span>{{ freeCount }} of {{ ROOMS.length }} rooms free</span>
        </div>

        <DayStrip v-model="from" :duration="duration" :load="floorLoad" label="Meeting time" />

        <div class="rb__durations">
          <button
            v-for="option in DURATIONS"
            :key="option.minutes"
            :class="{ active: duration === option.minutes }"
            @click="setDuration(option.minutes)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="rb__bar">
        <span class="rb__hint">Level 6 · meeting floor</span>
        <div class="rb__zoom">
          <button aria-label="Zoom out" @click="step(1 / 1.4)">−</button>
          <button aria-label="Zoom in" @click="step(1.4)">+</button>
          <button class="wide" @click="reset">Reset</button>
        </div>
      </div>

      <div ref="containerRef" class="rb__canvas" />

      <div class="rb__under">
        <div class="rb__card" :class="{ empty: !selected }">
          <template v-if="selected">
            <div class="rb__card-head">
              <strong>{{ selected.title }}</strong>
              <span class="rb__chip">
                {{ selected.kind === 'booth' ? 'Phone booth' : `Room ${selected.unit}` }}
              </span>
              <span class="rb__chip">{{ selected.seats }} {{ selected.seats === 1 ? 'seat' : 'seats' }}</span>
              <button class="rb__link" @click="copyLink">
                {{ copied ? 'Link copied' : 'Copy link' }}
              </button>
              <button class="rb__close" aria-label="Clear" @click="clear">×</button>
            </div>

            <div class="rb__kit">
              <span v-for="key in selected.equipment" :key="key" class="rb__kit-item">
                <span class="rb__icon" v-html="iconOf(key)" />
                {{ EQUIPMENT_LABEL[key] }}
              </span>
              <span class="rb__kit-item muted">{{ selected.wing }} facade</span>
            </div>

            <!-- The same control as above, now carrying this room's day. Drag
                 the window to move the meeting; the floor repaints with it -->
            <div class="rb__day">
              <DayStrip
                v-model="from"
                :duration="duration"
                :busy="dayOf[selected.id]"
                :mine="myBookingsIn(selected.id)"
                :state="requestClass"
                :label="`Meeting time in ${selected.title}`"
              />
            </div>

            <div class="rb__actions">
              <button v-if="myBookingHere" class="danger" @click="cancelHere">
                Cancel {{ fmtRange(myBookingHere.slot) }}
              </button>
              <button v-else class="primary" :disabled="!canBook" @click="book">
                {{ canBook ? `Book ${fmtRange(slot)}` : `Taken — ${describeLong(dayOf[selected.id], from)}` }}
              </button>
              <button v-if="!canBook && !myBookingHere && nextFree !== null" @click="jumpToFree">
                Next free at {{ fmt(nextFree) }}
              </button>
            </div>
          </template>

          <p v-else class="muted">
            Pick a room on the plan or in the list. Colour is availability for the slot above —
            move the slider and the whole floor repaints.
          </p>
        </div>

        <details class="rb__legend" :open="!narrow">
          <summary>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path fill="currentColor" d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z" />
            </svg>
            Legend
          </summary>
          <dl>
            <div v-for="item in LEGEND" :key="item.label">
              <dt><span class="rb__swatch" :class="item.state" /></dt>
              <dd>{{ item.label }}</dd>
            </div>
          </dl>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'
import type { SvgicItem } from '@svgic/core'
import type { ZoomPluginInstance } from '@svgic/core/plugins/zoom'
import { ContentPlugin } from '@svgic/core/plugins/content'
import DayStrip from './DayStrip.vue'
import {
  ROOMS,
  SCHEDULE,
  DAY_START,
  DAY_END,
  SLOT,
  EQUIPMENT_LABEL,
  changeAt,
  describe,
  describeLong,
  fits,
  fmt,
  fmtRange,
  planSrc,
  statusOf,
  type Equipment,
  type Interval,
  type Room,
} from '../../data/office'

/** Equipment filters, with the icon each one shows in the list and the card */
const EQUIPMENT = [
  { key: 'screen' as Equipment, svg: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M21 16H3V4h18m0-2H3c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h7v2H8v2h8v-2h-2v-2h7a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2"/></svg>' },
  { key: 'video' as Equipment, svg: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M15 8v8H5V8zm1-2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4V7a1 1 0 0 0-1-1"/></svg>' },
  { key: 'whiteboard' as Equipment, svg: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M2 3h8a2 2 0 0 1 2-2a2 2 0 0 1 2 2h8v2h-1v11h-5.75L17 22h-2l-1.75-6h-2.5L9 22H7l1.75-6H3V5H2zm3 2v9h14V5z"/></svg>' },
  { key: 'phone' as Equipment, svg: '<svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M20 15.5c-1.2 0-2.5-.2-3.6-.6h-.3c-.3 0-.5.1-.7.3l-2.2 2.2c-2.8-1.5-5.2-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1c-.3-1.1-.5-2.4-.5-3.6c0-.5-.5-1-1-1H4c-.5 0-1 .5-1 1c0 9.4 7.6 17 17 17c.5 0 1-.5 1-1v-3.5c0-.5-.5-1-1-1"/></svg>' },
]

const DURATIONS = [
  { minutes: 30, label: '30m' },
  { minutes: 60, label: '1h' },
  { minutes: 90, label: '1.5h' },
  { minutes: 120, label: '2h' },
]

const LEGEND = [
  { state: 'free', label: 'Free for the whole slot' },
  { state: 'soon', label: 'Free now, booked before the slot ends' },
  { state: 'busy', label: 'In use' },
  { state: 'mine', label: 'Booked by you' },
  { state: 'off', label: 'Filtered out' },
]

const containerRef = ref<HTMLElement>()
const from = ref(11 * 60 + 30)
const duration = ref(60)
const minSeats = ref(0)
const needs = ref<Equipment[]>([])
const selectedId = ref<string | null>(null)
const bookings = ref<{ room: string; slot: Interval }[]>([])
const copied = ref(false)
const narrow = ref(false)

let client: Svgic | null = null
let zoom: ZoomPluginInstance | null = null
let media: MediaQueryList | null = null

/** On a phone the list only earns its space once a filter is on */
const filtering = computed(() => minSeats.value > 0 || needs.value.length > 0)

const slot = computed<Interval>(() => [from.value, from.value + duration.value])

/**
 * The calendar as the floor sees it: what was already booked, plus whatever this
 * visitor has booked in this session. One derived map keeps the plan, the list
 * and the timeline from ever disagreeing.
 */
const dayOf = computed<Record<string, Interval[]>>(() => {
  const map: Record<string, Interval[]> = {}

  for (const room of ROOMS) {
    const mine = bookings.value.filter((b) => b.room === room.id).map((b) => b.slot)

    map[room.id] = [...(SCHEDULE[room.id] ?? []), ...mine].sort((a, b) => a[0] - b[0])
  }

  return map
})

const matches = (room: Room): boolean =>
  room.seats >= minSeats.value && needs.value.every((key) => room.equipment.includes(key))

const statusFor = (room: Room) => statusOf(dayOf.value[room.id]!, from.value, duration.value)

const overlapsSlot = (interval: Interval): boolean =>
  interval[0] < slot.value[1] && slot.value[0] < interval[1]

const myBookingsIn = (id: string): Interval[] =>
  bookings.value.filter((b) => b.room === id).map((b) => b.slot)

const selected = computed(() => ROOMS.find((room) => room.id === selectedId.value) ?? null)

const listed = computed(() => {
  const rank = { free: 0, soon: 1, busy: 2 }

  return ROOMS.filter(matches).sort(
    (a, b) =>
      rank[statusFor(a)] - rank[statusFor(b)] || a.seats - b.seats || a.title.localeCompare(b.title),
  )
})

const freeCount = computed(
  () => ROOMS.filter((room) => matches(room) && statusFor(room) === 'free').length,
)

/**
 * How much of the floor is taken, slot by slot, over the whole day.
 *
 * Drawn behind the day strip so the shape of the day is visible before anything
 * is clicked: it answers "when is there anything at all" without making the
 * visitor drag around looking for it. Filters narrow it, because the question is
 * always about the rooms that would actually do.
 */
const floorLoad = computed(() => {
  const pool = ROOMS.filter(matches)
  const slots = (DAY_END - DAY_START) / SLOT

  return Array.from({ length: slots }, (_, index) => {
    if (!pool.length) return 0

    const at = DAY_START + index * SLOT
    const taken = pool.filter((room) =>
      dayOf.value[room.id]!.some(([start, end]) => at >= start && at < end),
    ).length

    return taken / pool.length
  })
})

const dotClass = (room: Room) => (matches(room) ? statusFor(room) : 'off')

const titleOf = (id: string) => ROOMS.find((room) => room.id === id)?.title ?? id

const iconOf = (key: Equipment) => EQUIPMENT.find((item) => item.key === key)?.svg ?? ''

// ------------------------------------------------------------------ booking

const myBookingHere = computed(() => {
  if (!selected.value) return null

  return (
    bookings.value.find((b) => b.room === selected.value!.id && overlapsSlot(b.slot)) ?? null
  )
})

const canBook = computed(
  () => !!selected.value && fits(dayOf.value[selected.value.id]!, slot.value),
)

/** First slot start at which the selected room could take the whole meeting */
const nextFree = computed(() => {
  if (!selected.value) return null

  const day = dayOf.value[selected.value.id]!

  for (let at = from.value + SLOT; at <= DAY_END - duration.value; at += SLOT) {
    if (fits(day, [at, at + duration.value])) return at
  }

  return null
})

const book = () => {
  if (!selected.value || !canBook.value) return

  bookings.value = [...bookings.value, { room: selected.value.id, slot: [...slot.value] }]
}

const cancel = (index: number) => {
  bookings.value = bookings.value.filter((_, i) => i !== index)
}

const cancelHere = () => {
  const target = myBookingHere.value

  if (target) bookings.value = bookings.value.filter((b) => b !== target)
}

const jumpToFree = () => {
  if (nextFree.value !== null) from.value = nextFree.value
}

// ------------------------------------------------------------------ popup

/** What the status pill says about a room at the requested time */
const pill = (room: Room): { tone: string; text: string } => {
  const day = dayOf.value[room.id]!
  const own = bookings.value.find((b) => b.room === room.id && overlapsSlot(b.slot))

  if (own) return { tone: 'mine', text: `Yours, ${fmtRange(own.slot)}` }

  const status = statusFor(room)

  if (status === 'busy') return { tone: 'busy', text: `Busy till ${fmt(changeAt(day, from.value) ?? DAY_END)}` }
  if (status === 'soon') return { tone: 'soon', text: `Only till ${fmt(changeAt(day, from.value) ?? DAY_END)}` }

  return { tone: 'free', text: `Free ${fmtRange(slot.value)}` }
}

const line = (parent: HTMLElement, className: string, text: string): HTMLElement => {
  const node = document.createElement('div')

  node.className = className
  node.textContent = text
  parent.appendChild(node)

  return node
}

/**
 * The hover card.
 *
 * Answers what the shape cannot: the full kit, and when the room frees up. It
 * is built at hover time, so it reads the requested slot as it stands rather
 * than whatever it was when the floor was drawn.
 */
const renderPopup = (item: SvgicItem): HTMLElement => {
  const room = item as Room
  const box = document.createElement('div')

  box.className = 'rb-pop'

  const head = document.createElement('div')

  head.className = 'rb-pop__head'
  line(head, 'rb-pop__title', room.title)

  const status = pill(room)
  const tag = line(head, `rb-pop__pill ${status.tone}`, status.text)

  tag.classList.add('rb-pop__pill')
  box.appendChild(head)

  // A booth has no door number and no window — calling it "Room 6.01" would
  // also collide with the meeting room that carries that number
  const meta =
    room.kind === 'booth'
      ? `${room.seats} ${room.seats === 1 ? 'seat' : 'seats'} · Phone booth · ${room.wing.toLowerCase()} corridor`
      : `${room.seats} seats · Room ${room.unit} · ${room.wing} facade`

  line(box, 'rb-pop__meta', meta)

  if (room.equipment.length) {
    const kit = document.createElement('div')

    kit.className = 'rb-pop__kit'

    for (const key of room.equipment) {
      const chip = document.createElement('span')

      chip.innerHTML = iconOf(key)
      chip.append(EQUIPMENT_LABEL[key])
      kit.appendChild(chip)
    }

    box.appendChild(kit)
  }

  if (status.tone === 'busy' || status.tone === 'soon') {
    const day = dayOf.value[room.id]!

    for (let at = from.value + SLOT; at <= DAY_END - duration.value; at += SLOT) {
      if (fits(day, [at, at + duration.value])) {
        line(box, 'rb-pop__next', `Next free at ${fmt(at)}`)
        break
      }
    }
  }

  if (!matches(room)) line(box, 'rb-pop__off', 'Outside the current filter')

  return box
}

// --------------------------------------------------------------- the plan

const label = (item: Room | null) => item?.title

const roomContent = () => [
  {
    type: 'text' as const,
    text: ({ item }: { item: unknown }) => {
      const room = item as Room | null

      return room ? [room.title, `${room.seats} seats`, room.note ?? ''] : null
    },
    fill: 'var(--plan-ink)',
    fontWeight: 600,
    lineHeight: 1.25,
  },
  {
    type: 'text' as const,
    text: ({ item }: { item: unknown }) => {
      const room = item as Room | null

      return room ? [room.title, room.note ?? ''] : null
    },
    fill: 'var(--plan-ink)',
    fontWeight: 600,
    lineHeight: 1.25,
  },
  {
    type: 'text' as const,
    text: ({ item }: { item: unknown }) => label(item as Room | null),
    fill: 'var(--plan-ink)',
    fontWeight: 600,
  },
  {
    type: 'text' as const,
    text: ({ item }: { item: unknown }) => (item as Room | null)?.unit,
    fill: 'var(--plan-ink)',
    opacity: 0.55,
  },
]

/** Rooms as the plan needs them: the same records plus the line under the name */
const planData = computed(() =>
  ROOMS.map((room) => ({ ...room, note: describe(dayOf.value[room.id]!, from.value) })),
)

/**
 * Availability, expressed as highlight states.
 *
 * Every room carries exactly one status state, so the floor is repainted by
 * handing the library six lists — the colours themselves live in the plan and in
 * the style config, never in this function.
 */
const paint = () => {
  if (!client) return

  const groups: Record<string, string[]> = { free: [], soon: [], busy: [], off: [], mine: [] }

  for (const room of ROOMS) {
    if (matches(room)) groups[statusFor(room)]!.push(room.id)
    else groups['off']!.push(room.id)

    if (bookings.value.some((b) => b.room === room.id && overlapsSlot(b.slot))) {
      groups['mine']!.push(room.id)
    }
  }

  for (const [state, ids] of Object.entries(groups)) client.setHighlight(state, ids)

  client.setHighlight('picked', selectedId.value ? [selectedId.value] : [])
}

const mount = async () => {
  zoom = ZoomPlugin({ wheelMode: 'ctrl', minScale: 0.8, maxScale: 6, animate: true })

  client = new Svgic(containerRef.value!, {
    src: planSrc,
    layers: {
      rooms: { role: 'interactive' },
      booths: { role: 'interactive' },
    },
    data: planData.value,
    plugins: [
      zoom,
      ContentPlugin({ sourceLayer: 'rooms', fontScale: 46, content: roomContent() }),
      ContentPlugin({
        sourceLayer: 'booths',
        fontScale: 60,
        padding: 0.05,
        content: [
          {
            type: 'text',
            text: ({ item }) => label(item as Room | null),
            fill: 'var(--plan-ink)',
            fontWeight: 600,
          },
        ],
      }),
    ],
    popup: {
      placement: 'element',
      anchor: 'top-center',
      offset: { x: 0, y: -10 },
      hideDelay: 60,
      render: renderPopup,
    },
    style: {
      default: { cursor: 'pointer', transition: 'fill 0.18s, stroke 0.18s' },
      // Every room is always in some state, so the plain hover rule never applies
      highlightedHover: { stroke: 'var(--plan-accent)', strokeWidth: 3 },
      /*
       * Order matters: these rules all have the same specificity, so a state
       * listed later wins on the properties it sets. "picked" only sets a stroke,
       * which is why a selected room keeps the fill of its availability.
       */
      states: {
        free: { fill: 'var(--room-free)', stroke: 'var(--room-free-line)', strokeWidth: 1.6 },
        soon: { fill: 'var(--room-soon)', stroke: 'var(--room-soon-line)', strokeWidth: 1.6 },
        busy: { fill: 'var(--room-busy)', stroke: 'var(--room-busy-line)', strokeWidth: 1.6 },
        off: { fill: 'var(--room-off)', stroke: 'var(--plan-hair)', strokeWidth: 1.2 },
        mine: { fill: 'var(--room-mine)', stroke: 'var(--room-mine-line)', strokeWidth: 2 },
        picked: { stroke: 'var(--plan-accent)', strokeWidth: 4 },
      },
    },
  })

  await client.ready

  client.on('click', (id) => {
    if (id) select(id)
  })

  paint()
}

// ------------------------------------------------------------------- glue

const syncUrl = (id: string | null) => {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)

  if (id) url.searchParams.set('room', id)
  else url.searchParams.delete('room')

  window.history.replaceState(null, '', url)
}

const select = (id: string | null) => {
  selectedId.value = id
  copied.value = false
  syncUrl(id)
}

const goTo = (room: Room) => {
  select(room.id)
  zoom?.focusElement(room.id, { scale: narrow.value ? 3.2 : 2.2 })
}

const clear = () => select(null)

const step = (factor: number) => {
  const scale = (zoom?.getState().scale ?? 1) * factor

  zoom?.zoomTo(Math.min(6, Math.max(0.8, scale)))
}

const reset = () => {
  clear()
  zoom?.reset()
}

const setDuration = (minutes: number) => {
  duration.value = minutes
  // A longer meeting can push the start past the end of the day
  if (from.value + minutes > DAY_END) from.value = DAY_END - minutes
}

const toggleNeed = (key: Equipment) => {
  needs.value = needs.value.includes(key)
    ? needs.value.filter((item) => item !== key)
    : [...needs.value, key]
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

// ---------------------------------------------------------------- timeline

const requestClass = computed(() => {
  if (myBookingHere.value) return 'mine'

  return canBook.value ? 'ok' : 'clash'
})

// --------------------------------------------------------------- lifecycle

watch(planData, (value) => {
  client?.setData(value)
  paint()
})

watch([duration, minSeats, needs, selectedId], paint, { deep: true })

const openFromUrl = () => {
  if (typeof window === 'undefined') return

  const id = new URL(window.location.href).searchParams.get('room')
  const room = id ? ROOMS.find((item) => item.id === id) : null

  if (room) goTo(room)
}

function onMediaChange(event: MediaQueryListEvent) {
  narrow.value = event.matches
}

onMounted(async () => {
  media = window.matchMedia('(max-width: 900px)')
  narrow.value = media.matches
  media.addEventListener('change', onMediaChange)

  await mount()
  openFromUrl()
})

onUnmounted(() => {
  media?.removeEventListener('change', onMediaChange)
  client?.destroy()
})
</script>

<style scoped>
.rb {
  --dot-free: #2f9e5a;
  --dot-soon: #cf8a28;
  --dot-busy: #cf5555;
  --dot-mine: var(--vp-c-brand-1);
  --dot-off: var(--vp-c-text-3);
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr);
  grid-template-areas: 'side main';
  gap: 16px;
  align-items: start;
}
:global(.dark) .rb {
  --dot-free: #4cbd7d;
  --dot-soon: #d9a24a;
  --dot-busy: #e07a7a;
}
.rb__side { grid-area: side; }
.rb__main { grid-area: main; }

/*
 * On a phone the floor comes first, with the clock directly above it — that pair
 * is the demo, and filters standing in front of them would push the plan off the
 * screen. The room list is hidden until a filter is on, which is also the moment
 * it becomes the thing being read.
 */
@media (max-width: 900px) {
  .rb {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'main' 'side';
    gap: 10px;
  }
  .rb__list { display: none; }
  .rb.filtering .rb__list { display: block; max-height: 40vh; }
}

/* ---- sidebar ---- */
.rb__side {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}
.rb__filters { padding: 10px; border-bottom: 1px solid var(--vp-c-divider); }
.rb__field { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--vp-c-text-3); }
.rb__field select {
  flex: 1;
  padding: 7px 9px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
}
.rb__needs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.rb__needs button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 99px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-3);
  font-size: 11.5px;
  cursor: pointer;
}
.rb__needs button.on {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.rb__icon { display: inline-flex; }

.rb__list { list-style: none; margin: 0; padding: 6px; max-height: 372px; overflow: auto; }
.rb__list button {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 2px 8px;
  width: 100%;
  text-align: left;
  padding: 6px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.rb__list button:hover { background: var(--vp-c-bg-mute); }
.rb__list button.active { background: var(--vp-c-brand-soft); }
.rb__dot { width: 10px; height: 10px; border-radius: 50%; background: var(--dot-off); }
.rb__dot.free { background: var(--dot-free); }
.rb__dot.soon { background: var(--dot-soon); }
.rb__dot.busy { background: var(--dot-busy); }
.rb__name { font-size: 13px; font-weight: 600; }
.rb__seats {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}
.rb__note { grid-column: 2 / -1; font-size: 11px; color: var(--vp-c-text-3); }
.rb__empty { padding: 12px; font-size: 13px; color: var(--vp-c-text-3); }

.rb__mine { padding: 10px; border-top: 1px solid var(--vp-c-divider); }
.rb__mine h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--vp-c-text-3); }
.rb__booking {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  padding: 3px 0;
}
.rb__booking-time { font-family: var(--vp-font-family-mono); font-size: 11.5px; color: var(--vp-c-text-3); }
.rb__booking button {
  border: 0;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}
.rb__booking button:hover { color: var(--dot-busy); }

/* ---- the time bar ---- */
.rb__when {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  margin-bottom: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
@media (max-width: 720px) {
  .rb__when { grid-template-columns: 1fr; gap: 8px; }
}
/* Fixed width: the readout shrinks by a character as the count drops, and an
   auto column would resize the strip next to it while it is being dragged */
.rb__clock { display: flex; flex-direction: column; min-width: 132px; }
.rb__clock strong { font-size: 17px; font-family: var(--vp-font-family-mono); }
.rb__clock span { font-size: 11.5px; color: var(--vp-c-text-3); }
.rb__durations { display: flex; gap: 6px; }
.rb__durations button {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
}
.rb__durations button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}

/* ---- map ---- */
.rb__bar { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.rb__hint { font-size: 12px; color: var(--vp-c-text-3); }
.rb__zoom { display: flex; gap: 6px; margin-left: auto; }
.rb__zoom button {
  min-width: 34px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
}
.rb__zoom button:hover { background: var(--vp-c-bg-mute); }

.rb__canvas {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}
.rb__canvas :deep(svg) { display: block; width: 100%; height: auto; }

/* ---- under the map ---- */
.rb__under {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin-top: 12px;
  align-items: start;
}
@media (max-width: 720px) {
  .rb__under { grid-template-columns: 1fr; }
}

.rb__card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  padding: 12px 14px;
  min-height: 132px;
}
.rb__card.empty { display: flex; align-items: center; }
.rb__card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.rb__card-head strong { font-size: 15px; }
.rb__chip {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  padding: 2px 7px;
  border-radius: 99px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-3);
}
.rb__close {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.rb__kit { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: var(--vp-c-text-2); margin-bottom: 10px; }
.rb__kit-item { display: inline-flex; align-items: center; gap: 5px; }
.rb__kit-item.muted { color: var(--vp-c-text-3); }

.rb__day { margin-bottom: 10px; }

.rb__actions { display: flex; gap: 8px; flex-wrap: wrap; }
.rb__actions button {
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12.5px;
  cursor: pointer;
}
.rb__actions button.primary {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: var(--vp-c-bg);
  font-weight: 600;
}
.rb__actions button.primary:disabled {
  border-color: var(--vp-c-divider);
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-3);
  font-weight: 400;
  cursor: not-allowed;
}
.rb__actions button.danger { border-color: var(--dot-busy); color: var(--dot-busy); }

.muted { color: var(--vp-c-text-3); font-size: 12.5px; margin: 0; }

.rb__legend {
  padding: 12px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
/* A bare word does not read as something you can open, so the summary gets a
   chevron that turns — the affordance the default marker was providing. */
.rb__legend summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  cursor: pointer;
  list-style: none;
  user-select: none;
}
.rb__legend summary::-webkit-details-marker { display: none; }
.rb__legend summary svg { color: var(--vp-c-brand-1); transition: transform 0.18s; }
.rb__legend[open] summary svg { transform: rotate(180deg); }
.rb__legend[open] summary { margin-bottom: 8px; }
.rb__legend summary:hover { color: var(--vp-c-brand-1); }
.rb__legend dl { display: grid; gap: 5px; margin: 0; }
.rb__legend > dl > div { display: flex; align-items: center; gap: 8px; }
.rb__legend dd { margin: 0; font-size: 12px; color: var(--vp-c-text-2); }
.rb__swatch {
  display: block;
  width: 16px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-mute);
}
.rb__swatch.free { background: #d6efdd; border-color: #2f9e5a; }
.rb__swatch.soon { background: #fbe8cd; border-color: #cf8a28; }
.rb__swatch.busy { background: #f6dcdc; border-color: #cf5555; }
.rb__swatch.mine { background: #d8e3ff; border-color: #2f6df6; }
.rb__swatch.off { background: #eaeef4; border-color: #b7c1d5; }
:global(.dark) .rb__swatch.free { background: #24503a; border-color: #4cbd7d; }
:global(.dark) .rb__swatch.soon { background: #4d4128; border-color: #d9a24a; }
:global(.dark) .rb__swatch.busy { background: #4f2f36; border-color: #e07a7a; }
:global(.dark) .rb__swatch.mine { background: #2f3c6e; border-color: #7b97ff; }
:global(.dark) .rb__swatch.off { background: #24243c; border-color: #4b4b76; }

.rb__link {
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-3);
  border-radius: 99px;
  padding: 2px 9px;
  font-size: 11px;
  cursor: pointer;
}
.rb__link:hover { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); }
</style>

<!--
  The popup is mounted on document.body by the library, so its styles cannot be
  scoped to this component — a scoped rule would never reach it.
-->
<style>
.rb-pop {
  --pop-free: #2f9e5a;
  --pop-soon: #cf8a28;
  --pop-busy: #cf5555;
  --pop-mine: var(--vp-c-brand-1);
  position: absolute;
  z-index: 60;
  max-width: 260px;
  padding: 9px 11px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg-elv, var(--vp-c-bg));
  box-shadow: 0 6px 22px rgb(0 0 0 / 22%);
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--vp-c-text-1);
  /* Nothing in here is clickable, and a card under the cursor only flickers */
  pointer-events: none;
}
.dark .rb-pop { --pop-free: #4cbd7d; --pop-soon: #d9a24a; --pop-busy: #e07a7a; }

.rb-pop__head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.rb-pop__title { font-weight: 600; font-size: 13.5px; }
.rb-pop__pill {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 99px;
  border: 1px solid currentColor;
  font-size: 10.5px;
  font-family: var(--vp-font-family-mono);
  white-space: nowrap;
}
.rb-pop__pill.free { color: var(--pop-free); }
.rb-pop__pill.soon { color: var(--pop-soon); }
.rb-pop__pill.busy { color: var(--pop-busy); }
.rb-pop__pill.mine { color: var(--pop-mine); }

.rb-pop__meta { color: var(--vp-c-text-3); font-size: 11.5px; }
.rb-pop__kit { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 6px; color: var(--vp-c-text-2); font-size: 11.5px; }
.rb-pop__kit span { display: inline-flex; align-items: center; gap: 4px; }
.rb-pop__next { margin-top: 6px; color: var(--pop-free); font-size: 11.5px; }
.rb-pop__off { margin-top: 5px; color: var(--vp-c-text-3); font-size: 11px; font-style: italic; }
</style>
