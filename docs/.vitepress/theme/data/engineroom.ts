/**
 * A ship's central cooling system, as much of it as a mimic panel needs.
 *
 * Seawater is drawn through a sea chest, pushed through a strainer and the
 * central cooler and put back over the side. Freshwater goes round a closed
 * loop: pumps, cooler, three-way valve, main engine, back to the pumps. The
 * three-way valve is what actually holds the engine's inlet temperature — it
 * decides how much of the loop goes through the cooler and how much bypasses it.
 *
 * The numbers are the shape of the real thing rather than the real thing: heat
 * in from engine load, heat out through the cooler, pressure from how many
 * pumps are running. Enough for the panel to behave, not enough to run a ship.
 */
export interface Controls {
  /** Which pumps are running, by element id */
  pumps: Record<string, boolean>
  /** Which valves are open, by element id */
  valves: Record<string, boolean>
  /** Strainer fouling, 0 clean … 1 blocked */
  fouling: number
  /** Sea water temperature, °C */
  seaTemp: number
  /** Engine load, % MCR */
  load: number
  /** Standby pumps start themselves and the three-way valve controls itself */
  auto: boolean
}

export interface Plant {
  swFlow: number
  swPress: number
  /** Differential across the strainer, bar */
  dp: number
  swOut: number
  fwFlow: number
  fwPress: number
  /** Engine cooling water inlet and outlet, °C */
  tIn: number
  tOut: number
  /** Share of the loop routed through the cooler, 0…1 */
  mix: number
}

/** Rated duty of one pump, m³/h */
const SW_PUMP = 130
const FW_PUMP = 210
/** Two pumps in parallel do not move twice the water */
const PARALLEL = 0.85
/** Heat the engine puts into the loop at full load, kW */
const HEAT = 2800
/** kW carried by 1 m³/h of water per kelvin */
const CP = 1.16
/** What the three-way valve is trying to hold, °C */
export const SETPOINT = 36

/**
 * The plant as it stands when the watch is handed over: one pump a side, both
 * settled, the engine at three quarters. Starting from zeros would spend the
 * first seconds of the demo raising and clearing alarms nobody caused.
 */
export const INITIAL: Plant = {
  swFlow: 130,
  swPress: 1.9,
  dp: 0.14,
  swOut: 24,
  fwFlow: 210,
  fwPress: 2.6,
  tIn: 36,
  tOut: 44.6,
  mix: 0.8,
}

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))

/** First-order lag, so values move the way a gauge does rather than jumping */
const lag = (current: number, target: number, rate: number) => current + (target - current) * rate

const count = (state: Record<string, boolean>, ids: string[]) =>
  ids.reduce((sum, id) => sum + (state[id] ? 1 : 0), 0)

/**
 * One second of plant.
 *
 * Pure: the same controls and the same previous state always give the same next
 * state, which is what makes the panel worth trusting when a fault cascades.
 */
export const step = (plant: Plant, controls: Controls): Plant => {
  const { pumps, valves, fouling, seaTemp, load } = controls

  // --- seawater side -------------------------------------------------------
  const swRunning = count(pumps, ['p-sw-1', 'p-sw-2'])
  const suction = valves['v-sea-a'] || valves['v-sea-b']
  const overboard = valves['v-ob']

  let swFlowTarget = 0
  let swPressTarget = 0

  if (swRunning === 0 || !suction) {
    // No pump, or nothing to draw from: the line simply falls away
    swFlowTarget = 0
    swPressTarget = 0
  } else if (!overboard) {
    // Running against a shut discharge valve: pressure up, flow nowhere
    swFlowTarget = 0
    swPressTarget = 3.3
  } else {
    const gang = swRunning > 1 ? PARALLEL : 1

    swFlowTarget = SW_PUMP * swRunning * gang * (1 - 0.82 * fouling)
    swPressTarget = 1.9 + 0.55 * (swRunning - 1) - 0.5 * fouling
  }

  const swFlow = lag(plant.swFlow, swFlowTarget, 0.35)
  const swPress = lag(plant.swPress, swPressTarget, 0.35)
  const dp = lag(plant.dp, swFlow > 5 ? 0.14 + 1.25 * fouling : 0, 0.3)

  // --- freshwater loop -----------------------------------------------------
  const fwRunning = count(pumps, ['p-fw-1', 'p-fw-2'])
  const fwGang = fwRunning > 1 ? PARALLEL : 1
  const fwFlow = lag(plant.fwFlow, FW_PUMP * fwRunning * fwGang, 0.35)
  const fwPress = lag(plant.fwPress, fwRunning ? 2.6 + 0.5 * (fwRunning - 1) : 0, 0.35)

  // --- heat ----------------------------------------------------------------
  const heat = (load / 100) * HEAT
  // With the loop stopped the water still sits in a hot engine, so the rise is
  // capped rather than divided by zero
  const rise = fwFlow > 5 ? Math.min(60, heat / (fwFlow * CP)) : 60
  const tOut = lag(plant.tOut, plant.tIn + rise, 0.12)

  const effectiveness = 0.78 * clamp(swFlow / 240) * clamp(fwFlow / 210)
  const cooled = tOut - effectiveness * (tOut - seaTemp)

  // The three-way valve: how much of the loop is sent through the cooler
  const error = plant.tIn - SETPOINT
  const mix = controls.auto ? clamp(plant.mix + error * 0.07) : plant.mix

  const tIn = lag(plant.tIn, mix * cooled + (1 - mix) * tOut, 0.14)

  // What the sea takes away, expressed as the discharge temperature
  const removed = mix * fwFlow * CP * (tOut - cooled)
  const swOut = lag(plant.swOut, swFlow > 5 ? seaTemp + removed / (swFlow * CP) : seaTemp, 0.2)

  return { swFlow, swPress, dp, swOut, fwFlow, fwPress, tIn, tOut, mix }
}

// ------------------------------------------------------------------- alarms

export type Level = 'warning' | 'alarm'

export interface Alarm {
  id: string
  text: string
  level: Level
  /** Instrument the alarm belongs to, so the panel can mark it */
  readout?: string
}

/** What the watchkeeper would be told about, worst first */
export const alarmsOf = (plant: Plant, controls: Controls): Alarm[] => {
  const out: Alarm[] = []
  const swRunning = count(controls.pumps, ['p-sw-1', 'p-sw-2'])
  const fwRunning = count(controls.pumps, ['p-fw-1', 'p-fw-2'])

  if (fwRunning === 0) {
    out.push({ id: 'fw-stopped', text: 'LT cooling pumps stopped', level: 'alarm', readout: 'ri-fw-p' })
  } else if (plant.fwPress < 1.6) {
    out.push({ id: 'fw-press', text: 'LT cooling water pressure low', level: 'alarm', readout: 'ri-fw-p' })
  }

  if (swRunning === 0) {
    out.push({ id: 'sw-stopped', text: 'Sea water pumps stopped', level: 'alarm', readout: 'ri-sw-p' })
  } else if (plant.swFlow < 20) {
    out.push({ id: 'sw-flow', text: 'No sea water flow', level: 'alarm', readout: 'ri-sw-f' })
  } else if (plant.swPress < 1.4) {
    out.push({ id: 'sw-press', text: 'Sea water pressure low', level: 'warning', readout: 'ri-sw-p' })
  }

  if (plant.dp > 1.0) {
    out.push({ id: 'dp-high', text: 'SW strainer differential high', level: 'alarm', readout: 'ri-dp' })
  } else if (plant.dp > 0.7) {
    out.push({ id: 'dp-warn', text: 'SW strainer fouling', level: 'warning', readout: 'ri-dp' })
  }

  if (plant.tOut > 62) {
    out.push({ id: 't-out-high', text: 'ME cooling water outlet high', level: 'alarm', readout: 'ri-t-out' })
  } else if (plant.tOut > 57) {
    out.push({ id: 't-out-warn', text: 'ME cooling water outlet rising', level: 'warning', readout: 'ri-t-out' })
  }

  if (plant.tIn > SETPOINT + 6) {
    out.push({ id: 't-in-high', text: 'ME inlet above setpoint', level: 'warning', readout: 'ri-t-in' })
  }

  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'alarm' ? -1 : 1))
}

// --------------------------------------------------------------- the panel

export interface Instrument {
  id: string
  title: string
  unit: string
  value: (plant: Plant, controls: Controls) => number
  /** Decimal places on the panel */
  digits?: number
}

export const INSTRUMENTS: Instrument[] = [
  { id: 'ri-sea', title: 'Sea water temperature', unit: '°C', value: (_, c) => c.seaTemp },
  { id: 'ri-sw-p', title: 'SW pump discharge', unit: 'bar', value: (p) => p.swPress, digits: 1 },
  { id: 'ri-dp', title: 'Strainer differential', unit: 'bar', value: (p) => p.dp, digits: 2 },
  { id: 'ri-sw-f', title: 'Sea water flow', unit: 'm³/h', value: (p) => p.swFlow },
  { id: 'ri-fw-p', title: 'LT pump discharge', unit: 'bar', value: (p) => p.fwPress, digits: 1 },
  { id: 'ri-t-in', title: 'ME cooling water inlet', unit: '°C', value: (p) => p.tIn, digits: 1 },
  { id: 'ri-t-out', title: 'ME cooling water outlet', unit: '°C', value: (p) => p.tOut, digits: 1 },
  { id: 'ri-mix', title: 'Three-way valve to cooler', unit: '%', value: (p) => p.mix * 100 },
  { id: 'ri-load', title: 'Main engine load', unit: '% MCR', value: (_, c) => c.load },
]

/** What each unit is, for the hover card and the control list */
export const UNITS: Record<string, { title: string; kind: 'pump' | 'valve' | 'fixed'; note?: string }> = {
  'sea-a': { title: 'Sea chest (low)', kind: 'fixed', note: 'Deep suction, used at sea' },
  'sea-b': { title: 'Sea chest (high)', kind: 'fixed', note: 'Shallow suction, used in port' },
  'v-sea-a': { title: 'Low sea chest valve', kind: 'valve' },
  'v-sea-b': { title: 'High sea chest valve', kind: 'valve' },
  'p-sw-1': { title: 'SW cooling pump 1', kind: 'pump', note: '130 m³/h at 2.4 bar' },
  'p-sw-2': { title: 'SW cooling pump 2', kind: 'pump', note: 'Standby' },
  'f-sw': { title: 'Sea water strainer', kind: 'fixed', note: 'Basket type, cleaned in service' },
  hx: { title: 'Central cooler', kind: 'fixed', note: 'Plate type, seawater to freshwater' },
  'v-ob': { title: 'Overboard valve', kind: 'valve' },
  'p-fw-1': { title: 'LT cooling pump 1', kind: 'pump', note: '210 m³/h at 3.0 bar' },
  'p-fw-2': { title: 'LT cooling pump 2', kind: 'pump', note: 'Standby' },
  'v-3w': { title: 'Three-way control valve', kind: 'fixed', note: 'Holds the engine inlet at 36 °C' },
  'tank-exp': { title: 'Expansion tank', kind: 'fixed', note: 'Keeps the loop full and vented' },
  eng: { title: 'Main engine', kind: 'fixed', note: '6-cylinder, cooled by the LT loop' },
}

/** What each run carries, for the hover card */
export const PIPE_TITLES: Record<string, string> = {
  'pipe-sea-a': 'Low sea chest suction',
  'pipe-sea-b': 'High sea chest suction',
  'pipe-sw-suction': 'SW pump suction manifold',
  'pipe-sw-discharge': 'SW pump discharge manifold',
  'pipe-sw-cooler': 'SW to central cooler',
  'pipe-sw-overboard': 'SW from cooler to overboard',
  'pipe-sw-sea': 'Overboard discharge',
  'pipe-fw-suction': 'LT pump suction',
  'pipe-fw-discharge': 'LT pump discharge',
  'pipe-fw-bypass': 'Cooler bypass',
  'pipe-fw-cooler-in': 'LT to central cooler',
  'pipe-fw-cooler-out': 'LT from central cooler',
  'pipe-fw-engine': 'LT to main engine',
  'pipe-fw-return': 'LT return from main engine',
  'pipe-exp': 'Expansion tank connection',
}

/** Which pipe runs carry water, given what is running and open */
export const flowingPipes = (plant: Plant, controls: Controls): string[] => {
  const out: string[] = []
  const sw = plant.swFlow > 20
  const fw = plant.fwFlow > 20

  if (sw && controls.valves['v-sea-a']) out.push('pipe-sea-a')
  if (sw && controls.valves['v-sea-b']) out.push('pipe-sea-b')
  if (sw) out.push('pipe-sw-suction', 'pipe-sw-discharge', 'pipe-sw-cooler', 'pipe-sw-overboard', 'pipe-sw-sea')

  if (fw) {
    out.push('pipe-fw-suction', 'pipe-fw-discharge', 'pipe-fw-engine', 'pipe-fw-return')

    if (plant.mix > 0.05) out.push('pipe-fw-cooler-in', 'pipe-fw-cooler-out')
    if (plant.mix < 0.95) out.push('pipe-fw-bypass')
  }

  return out
}

export const planSrc = '/svgs/engineroom.svg'
