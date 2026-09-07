import type { SvgicItem } from '@svgic/core'
import { SEATS as SHAPES, type SeatShape } from './seats.generated'

/**
 * The house.
 *
 * Geometry comes from `seats.generated.ts`, which `scripts/gen-theatre.mjs`
 * writes alongside the SVG so the plan and the data cannot drift apart. This
 * file adds everything the box office knows: what a seat costs, what is already
 * sold for a given performance, and how to find seats next to each other.
 */
export type ZoneId = 'a' | 'b' | 'c' | 'd' | 'e' | 'box'

export interface Zone {
  id: ZoneId
  title: string
  price: number
}

export const ZONES: Zone[] = [
  { id: 'a', title: 'Stalls A', price: 120 },
  { id: 'b', title: 'Stalls B', price: 90 },
  { id: 'c', title: 'Stalls C', price: 65 },
  { id: 'd', title: 'Amphitheatre', price: 45 },
  { id: 'e', title: 'Balcony', price: 30 },
  { id: 'box', title: 'Box', price: 160 },
]

const ZONE_BY_ID = Object.fromEntries(ZONES.map((zone) => [zone.id, zone])) as Record<ZoneId, Zone>

export const zoneOf = (id: ZoneId): Zone => ZONE_BY_ID[id]

export interface Seat extends SvgicItem, SeatShape {
  zone: ZoneId
  price: number
  /** `Row 4, seat 12` — the way a ticket prints it */
  title: string
}

export const SEATS: Seat[] = SHAPES.map((shape) => ({
  ...shape,
  zone: shape.zone as ZoneId,
  price: ZONE_BY_ID[shape.zone as ZoneId].price,
  title: shape.sector === 'Boxes'
    ? `Box ${shape.row}, seat ${shape.number}`
    : `Row ${shape.row}, seat ${shape.number}`,
}))

export const SEAT_BY_ID = new Map(SEATS.map((seat) => [seat.id, seat]))

/** Seats in the order they sit, one entry per block of a row */
const BLOCKS: Seat[][] = (() => {
  const groups = new Map<string, Seat[]>()

  for (const seat of SEATS) {
    const key = `${seat.sector}|${seat.row}|${seat.block}`
    const group = groups.get(key)

    if (group) group.push(seat)
    else groups.set(key, [seat])
  }

  for (const group of groups.values()) group.sort((a, b) => a.number - b.number)

  return [...groups.values()]
})()

// ------------------------------------------------------------------ the run

export interface Session {
  id: string
  day: string
  time: string
  note?: string
  /** Roughly how full the house is — the rest is down to which seats sell first */
  load: number
}

export const SESSIONS: Session[] = [
  { id: 'fri', day: 'Fri 11 Sep', time: '19:00', load: 0.46 },
  { id: 'sat-mat', day: 'Sat 12 Sep', time: '14:00', note: 'matinee', load: 0.34 },
  { id: 'sat', day: 'Sat 12 Sep', time: '19:00', load: 0.72 },
  { id: 'sun', day: 'Sun 13 Sep', time: '18:00', note: 'last night', load: 0.86 },
]

/** How much a zone is fought over, relative to the house average */
const DEMAND: Record<ZoneId, number> = { a: 1.25, b: 1.15, c: 0.95, d: 0.8, e: 0.66, box: 0.9 }

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

/**
 * Which seats are already gone for a performance.
 *
 * Sold in short runs rather than at random: tickets are bought two and three at
 * a time, and a house speckled with lone empty seats would make the "seats
 * together" search meaningless. Seeded, so the server and the browser agree and
 * a shared link still points at the same seats.
 */
const cache = new Map<string, Set<string>>()

export const soldFor = (sessionId: string): Set<string> => {
  const hit = cache.get(sessionId)

  if (hit) return hit

  const session = SESSIONS.find((item) => item.id === sessionId) ?? SESSIONS[0]!
  const sold = new Set<string>()

  for (const block of BLOCKS) {
    const rand = lcg(hash(`${sessionId}:${block[0]!.id}`))
    // How full this block ends up: the house average, bent by how hard its
    // price band is fought over
    const wanted = Math.round(block.length * Math.min(0.97, session.load * DEMAND[block[0]!.zone]))
    let taken = 0
    let guard = 0

    // Runs land at random and are allowed to touch, which is what leaves the
    // ragged edges a real seating chart has
    while (taken < wanted && guard++ < 400) {
      const start = Math.floor(rand() * block.length)
      const length = 1 + Math.floor(rand() * 4)

      for (let k = 0; k < length && start + k < block.length && taken < wanted; k++) {
        const id = block[start + k]!.id

        if (!sold.has(id)) {
          sold.add(id)
          taken += 1
        }
      }
    }
  }

  cache.set(sessionId, sold)

  return sold
}

// --------------------------------------------------------------- neighbours

/**
 * Every run of `size` free seats sitting next to each other.
 *
 * Blocks are the unit, not rows: two seats either side of an aisle have
 * consecutive numbers and are not together in any sense a theatregoer accepts.
 */
export const runsOf = (size: number, sold: Set<string>, taken: Set<string> = new Set()): Seat[][] => {
  const out: Seat[][] = []

  for (const block of BLOCKS) {
    let run: Seat[] = []

    for (const seat of block) {
      if (sold.has(seat.id) || taken.has(seat.id)) {
        run = []
        continue
      }

      run.push(seat)

      if (run.length >= size) out.push(run.slice(run.length - size))
    }
  }

  return out
}

/** Seats in the widest row of each sector, so "middle of the row" has a meaning */
const ROW_WIDTH = (() => {
  const widths = new Map<string, number>()

  for (const seat of SEATS) {
    const key = `${seat.sector}|${seat.row}`

    widths.set(key, Math.max(widths.get(key) ?? 0, seat.number))
  }

  return widths
})()

/** How far back a sector sits, since every one of them numbers its rows from 1 */
const DEPTH: Record<string, number> = {
  Stalls: 0,
  Boxes: 0.5,
  Amphitheatre: 0.9,
  Balcony: 1.5,
}

/**
 * How good a seat is, smaller being better: middle of the row, near the front.
 * Crude on purpose — a real house would have a sightline model behind this.
 */
const penalty = (seat: Seat): number => {
  const width = ROW_WIDTH.get(`${seat.sector}|${seat.row}`) ?? 1

  return (
    Math.abs(seat.number - (width + 1) / 2) / width + seat.row * 0.05 + (DEPTH[seat.sector] ?? 0)
  )
}

/** The run a box office would offer first: the best seats still inside the budget */
export const bestRun = (runs: Seat[][], budget: number): Seat[] | null => {
  const affordable = runs.filter((run) => run.every((seat) => seat.price <= budget))
  const pool = affordable.length ? affordable : runs

  return (
    pool
      .map((run) => ({
        run,
        score: run.reduce((sum, seat) => sum + penalty(seat), 0) / run.length,
      }))
      .sort((a, b) => a.score - b.score)[0]?.run ?? null
  )
}

export const money = (amount: number): string => `$${amount}`

export const planSrc = '/svgs/theatre.svg'

/** Ceiling on a single order, the way a box office caps one */
export const MAX_SEATS = 6
