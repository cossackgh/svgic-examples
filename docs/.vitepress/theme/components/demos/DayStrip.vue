<template>
  <div class="strip">
    <div
      ref="trackRef"
      class="strip__track"
      role="slider"
      tabindex="0"
      :aria-label="label"
      :aria-valuemin="DAY_START"
      :aria-valuemax="DAY_END - duration"
      :aria-valuenow="modelValue"
      :aria-valuetext="fmtRange([modelValue, modelValue + duration])"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeyDown"
    >
      <!-- How busy the floor is, hour by hour. Background information: it says
           where to drag, and is never the thing you are pointing at -->
      <div
        v-for="(value, index) in load ?? []"
        :key="`load-${index}`"
        class="strip__load"
        :style="loadStyle(index, value)"
      />

      <!-- Occupied time. Filled means taken, here and on every other strip -->
      <div
        v-for="(interval, index) in busy ?? []"
        :key="`busy-${index}`"
        class="strip__busy"
        :class="{ mine: isMine(interval) }"
        :style="span(interval)"
        :title="fmtRange(interval)"
      />

      <!-- What you are asking for. Outlined, never filled — the one shape on the
           strip that belongs to you rather than to the calendar -->
      <div class="strip__window" :class="state" :style="span([modelValue, modelValue + duration])">
        <span class="strip__grip" />
      </div>
    </div>

    <div class="strip__ticks">
      <span v-for="hour in TICKS" :key="hour" :style="{ left: `${pct(hour * 60)}%` }">{{ hour }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { DAY_START, DAY_END, SLOT, fmtRange, type Interval } from '../../data/office'

const props = withDefaults(
  defineProps<{
    /** Start of the requested slot, in minutes since midnight */
    modelValue: number
    /** Length of the requested slot, in minutes */
    duration: number
    /** Time already taken, drawn as filled blocks */
    busy?: Interval[]
    /** Which of those blocks belong to this visitor */
    mine?: Interval[]
    /** Occupancy per slot, 0..1, drawn as a background histogram */
    load?: number[]
    /** How the requested window reads against what is already booked */
    state?: 'ok' | 'clash' | 'mine'
    label?: string
  }>(),
  { state: 'ok', label: 'Meeting time' },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const TICKS = [8, 10, 12, 14, 16, 18, 20]

const trackRef = ref<HTMLElement>()
const dragging = ref(false)
/** Distance from the start of the window to the point the pointer grabbed it by */
let grabOffset = 0
/**
 * The track as it was when the drag started.
 *
 * Measured once and reused: anything the new value changes on the page — a
 * readout growing by a character, a card appearing — can reflow the track under
 * the pointer, and re-measuring mid-drag would make the day slide about.
 */
let dragBox: DOMRect | null = null

const pct = (minute: number) => ((minute - DAY_START) / (DAY_END - DAY_START)) * 100

const span = ([start, end]: Interval) => ({
  left: `${pct(start)}%`,
  width: `${pct(end) - pct(start)}%`,
})

const loadStyle = (index: number, value: number) => {
  const step = 100 / (props.load?.length || 1)

  return { left: `${index * step}%`, width: `${step}%`, height: `${Math.round(value * 100)}%` }
}

const isMine = (interval: Interval) =>
  (props.mine ?? []).some((own) => own[0] === interval[0] && own[1] === interval[1])

const clamp = (minute: number) => Math.min(DAY_END - props.duration, Math.max(DAY_START, minute))

const snap = (minute: number) => clamp(Math.round(minute / SLOT) * SLOT)

/** Where along the day a pointer sits, in minutes */
const minuteAt = (clientX: number): number => {
  const box = dragBox ?? trackRef.value!.getBoundingClientRect()

  return DAY_START + ((clientX - box.left) / box.width) * (DAY_END - DAY_START)
}

const move = (clientX: number) => {
  const next = snap(minuteAt(clientX) - grabOffset)

  if (next !== props.modelValue) emit('update:modelValue', next)
}

/**
 * Dragging, not aiming.
 *
 * Grabbing the window keeps hold of the point you took it by, so it slides with
 * the pointer instead of jumping; pressing anywhere else brings the window to
 * the pointer and carries on as a drag from its middle. Either way the gesture
 * ends where it started — there is no second click to correct the first.
 */
const onPointerDown = (event: PointerEvent) => {
  dragBox = trackRef.value!.getBoundingClientRect()

  const at = minuteAt(event.clientX)
  const inside = at >= props.modelValue && at <= props.modelValue + props.duration

  grabOffset = inside ? at - props.modelValue : props.duration / 2
  dragging.value = true
  move(event.clientX)
  // preventScroll: focusing on a press must not yank the page under the finger
  trackRef.value?.focus({ preventScroll: true })
  // Capture keeps the moves coming when the pointer leaves the track, but the
  // drag is driven by the flag — a browser that refuses capture still works
  try {
    trackRef.value?.setPointerCapture(event.pointerId)
  } catch {
    // no capture, no problem
  }
  event.preventDefault()
}

const onPointerMove = (event: PointerEvent) => {
  if (dragging.value) move(event.clientX)
}

const onPointerUp = (event: PointerEvent) => {
  dragging.value = false
  dragBox = null

  try {
    trackRef.value?.releasePointerCapture(event.pointerId)
  } catch {
    // nothing was captured
  }
}

const onKeyDown = (event: KeyboardEvent) => {
  const steps: Record<string, number> = {
    ArrowLeft: -SLOT,
    ArrowDown: -SLOT,
    ArrowRight: SLOT,
    ArrowUp: SLOT,
    PageDown: -60,
    PageUp: 60,
  }

  let next: number | null = null

  if (event.key in steps) next = clamp(props.modelValue + steps[event.key]!)
  if (event.key === 'Home') next = DAY_START
  if (event.key === 'End') next = DAY_END - props.duration

  if (next === null) return

  emit('update:modelValue', next)
  event.preventDefault()
}
</script>

<style scoped>
.strip { user-select: none; }

.strip__track {
  position: relative;
  height: 34px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  overflow: hidden;
  cursor: grab;
  /* A drag along the day must not scroll the page under it */
  touch-action: none;
}
.strip__track:active { cursor: grabbing; }
.strip__track:focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }

.strip__load {
  position: absolute;
  bottom: 0;
  background: var(--vp-c-text-3);
  opacity: 0.16;
}

.strip__busy {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--dot-busy, #cf5555);
  opacity: 0.5;
  border-right: 1px solid var(--vp-c-bg);
}
.strip__busy.mine { background: var(--dot-mine, #2f6df6); opacity: 0.75; }

.strip__window {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--vp-c-text-1);
  border-radius: 5px;
  background: color-mix(in srgb, var(--vp-c-bg) 45%, transparent);
  transition: left 0.08s linear, width 0.12s;
}
.strip__window.ok { border-color: var(--dot-free, #2f9e5a); }
.strip__window.clash { border-color: var(--dot-busy, #cf5555); }
.strip__window.mine { border-color: var(--dot-mine, #2f6df6); }

/* Two hairlines, so the window reads as something with a handle on it */
.strip__grip {
  width: 10px;
  height: 12px;
  border-left: 2px solid currentColor;
  border-right: 2px solid currentColor;
  border-radius: 1px;
  color: var(--vp-c-text-3);
  opacity: 0.7;
}

.strip__ticks { position: relative; height: 15px; margin-top: 2px; }
.strip__ticks span {
  position: absolute;
  transform: translateX(-50%);
  font-size: 10px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}
</style>
