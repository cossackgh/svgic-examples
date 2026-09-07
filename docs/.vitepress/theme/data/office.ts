import type { SvgicItem } from '@svgic/core'

/**
 * Rooms of the demo meeting floor.
 *
 * Kept apart from the component so the plan, the list and the timeline all read
 * the same directory, the way a real application would read it from a calendar
 * API. Ids match the elements in `public/svgs/office-l6.svg`, which is produced
 * by `scripts/gen-office.mjs`.
 */
export type Equipment = 'screen' | 'video' | 'whiteboard' | 'phone'

export interface Room extends SvgicItem {
  id: string
  title: string
  seats: number
  kind: 'boardroom' | 'meeting' | 'huddle' | 'booth'
  equipment: Equipment[]
  wing: 'North' | 'East' | 'South' | 'West'
  /** Room number as printed on the door */
  unit: string
  /** Filled in by the component for the selected time — see `describe()` */
  note?: string
}

/** Minutes since midnight. The floor is bookable between these two */
export const DAY_START = 8 * 60
export const DAY_END = 20 * 60
/** Booking granularity, in minutes */
export const SLOT = 30

export type Interval = [start: number, end: number]

/**
 * Number as it is printed on the door.
 *
 * Booths are numbered apart: stripping the letter would give `r-601` and
 * `b-601` the same "6.01", and a booth has no door number to share anyway.
 */
const unitOf = (id: string): string => {
  const [prefix, number] = id.split('-') as [string, string]

  if (prefix === 'b') return `P-${number.slice(1)}`

  return `${number[0]}.${number.slice(1)}`
}

const room = (
  id: string,
  title: string,
  seats: number,
  kind: Room['kind'],
  wing: Room['wing'],
  equipment: Equipment[],
): Room => ({ id, title, seats, kind, wing, equipment, unit: unitOf(id) })

export const ROOMS: Room[] = [
  // ---- north facade ----
  room('r-601', 'Danube', 14, 'boardroom', 'North', ['screen', 'video', 'whiteboard']),
  room('r-602', 'Rhine', 6, 'meeting', 'North', ['screen', 'video']),
  room('r-603', 'Thames', 6, 'meeting', 'North', ['screen']),
  room('r-604', 'Seine', 8, 'meeting', 'North', ['screen', 'video', 'whiteboard']),
  room('r-605', 'Douro', 6, 'meeting', 'North', ['whiteboard']),
  room('r-606', 'Elbe', 6, 'meeting', 'North', ['screen', 'video']),
  room('r-607', 'Loire', 8, 'meeting', 'North', ['screen', 'whiteboard']),

  // ---- east facade ----
  room('r-608', 'Sava', 4, 'huddle', 'East', ['screen']),
  room('r-609', 'Morava', 4, 'huddle', 'East', ['video']),
  room('r-610', 'Drina', 4, 'huddle', 'East', ['whiteboard']),

  // ---- south facade ----
  room('r-611', 'Volga', 10, 'meeting', 'South', ['screen', 'video', 'whiteboard']),
  room('r-612', 'Tagus', 6, 'meeting', 'South', ['screen']),
  room('r-613', 'Vistula', 6, 'meeting', 'South', ['video']),
  room('r-614', 'Ebro', 6, 'meeting', 'South', ['screen', 'video']),
  room('r-615', 'Shannon', 8, 'meeting', 'South', ['screen', 'whiteboard']),
  room('r-616', 'Tiber', 6, 'meeting', 'South', ['screen']),
  room('r-617', 'Arno', 6, 'meeting', 'South', ['video', 'whiteboard']),
  room('r-618', 'Neva', 10, 'meeting', 'South', ['screen', 'video']),

  // ---- west facade ----
  room('r-619', 'Oder', 5, 'meeting', 'West', ['screen']),
  room('r-620', 'Vardar', 5, 'meeting', 'West', ['whiteboard']),

  // ---- phone booths, standing in the corridor ----
  room('b-601', 'Pod A', 1, 'booth', 'North', ['video', 'phone']),
  room('b-602', 'Pod B', 1, 'booth', 'North', ['video', 'phone']),
  room('b-603', 'Pod C', 1, 'booth', 'South', ['video', 'phone']),
  room('b-604', 'Pod D', 1, 'booth', 'South', ['phone']),
]

// --------------------------------------------------------------- the day

/**
 * The working day, generated rather than written out.
 *
 * A seeded generator keeps the floor identical on the server and in the browser
 * — a demo that reshuffles itself on hydration would flicker, and a link to a
 * room would stop meaning anything.
 */
const lcg = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0

  return seed / 0x100000000
}

const hash = (text: string): number => {
  let h = 2166136261

  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }

  return h >>> 0
}

/** How likely a meeting is to start at a given time — the shape of an office day */
const pressure = (minute: number): number => {
  const hour = minute / 60

  if (hour < 9) return 0.1
  if (hour < 12) return 0.3
  if (hour < 13) return 0.12
  if (hour < 14) return 0.22
  if (hour < 17) return 0.32
  if (hour < 19) return 0.16

  return 0.06
}

const buildDay = (id: string, kind: Room['kind']): Interval[] => {
  const rand = lcg(hash(id))
  const lengths = kind === 'booth' ? [30, 30, 60] : [30, 60, 60, 90, 120]
  const out: Interval[] = []
  let at = DAY_START

  while (at < DAY_END) {
    if (rand() < pressure(at)) {
      const length = lengths[Math.floor(rand() * lengths.length)]!
      const end = Math.min(at + length, DAY_END)

      out.push([at, end])
      // A gap after a meeting, so the day does not read as one solid block
      at = end + (rand() < 0.55 ? SLOT : 0)
    } else {
      at += SLOT
    }
  }

  return out
}

/** Bookings already in the calendar, by room id */
export const SCHEDULE: Record<string, Interval[]> = Object.fromEntries(
  ROOMS.map((r) => [r.id, buildDay(r.id, r.kind)]),
)

// ------------------------------------------------------------- availability

export type RoomStatus = 'free' | 'soon' | 'busy'

const overlaps = (a: Interval, b: Interval): boolean => a[0] < b[1] && b[0] < a[1]

/**
 * Whether a room can take a meeting of `duration` starting at `from`:
 * - `busy` — something is running right now
 * - `soon` — free at that moment, but not for the whole meeting
 * - `free` — clear all the way through
 */
export const statusOf = (busy: Interval[], from: number, duration: number): RoomStatus => {
  if (busy.some(([start, end]) => from >= start && from < end)) return 'busy'

  return busy.some((iv) => overlaps(iv, [from, from + duration])) ? 'soon' : 'free'
}

/** End of the current meeting, or start of the next one — whichever applies */
export const changeAt = (busy: Interval[], from: number): number | null => {
  const running = busy.find(([start, end]) => from >= start && from < end)

  if (running) return running[1]

  const next = busy
    .filter(([start]) => start > from)
    .sort((a, b) => a[0] - b[0])[0]

  return next ? next[0] : null
}

export const fits = (busy: Interval[], slot: Interval): boolean =>
  slot[0] >= DAY_START && slot[1] <= DAY_END && !busy.some((iv) => overlaps(iv, slot))

// ------------------------------------------------------------------ format

export const fmt = (minute: number): string => {
  const h = Math.floor(minute / 60)
  const m = minute % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const fmtRange = ([start, end]: Interval): string => `${fmt(start)} – ${fmt(end)}`

/**
 * The third line of a room label on the plan.
 *
 * Deliberately just the hour: the colour already says whether the room is free
 * or taken, and a room 146 units wide has no space for repeating it in words.
 */
export const describe = (busy: Interval[], from: number): string =>
  `till ${fmt(changeAt(busy, from) ?? DAY_END)}`

/** The same fact spelled out, for the list and the card */
export const describeLong = (busy: Interval[], from: number): string => {
  const running = busy.find(([start, end]) => from >= start && from < end)

  if (running) return `busy till ${fmt(running[1])}`

  const until = changeAt(busy, from)

  return until ? `free till ${fmt(until)}` : 'free for the rest of the day'
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  screen: 'Screen',
  video: 'Video call',
  whiteboard: 'Whiteboard',
  phone: 'Phone',
}

export const planSrc = '/svgs/office-l6.svg'
