<template>
  <div class="mallnav" :class="{ searching }">
    <aside class="mallnav__side">
      <div class="mallnav__filters">
        <input
          v-model="query"
          type="search"
          placeholder="Find a shop"
          aria-label="Find a shop"
        />
        <select v-model="category" aria-label="Category">
          <option value="">All categories</option>
          <option v-for="name in categories" :key="name" :value="name">{{ name }}</option>
        </select>
      </div>

      <ul class="mallnav__results">
        <li v-if="!results.length" class="mallnav__empty">Nothing matches</li>
        <li v-for="tenant in results" :key="tenant.id">
          <button :class="{ active: selected?.id === tenant.id }" @click="goTo(tenant)">
            <span class="mallnav__name">{{ tenant.title }}</span>
            <span class="mallnav__meta">{{ tenant.category }} · Level {{ tenant.level }}</span>
          </button>
        </li>
      </ul>
    </aside>

    <div class="mallnav__main">
      <div class="mallnav__bar">
        <div class="mallnav__levels">
          <button
            v-for="level in LEVELS"
            :key="level"
            :class="{ active: level === current }"
            @click="setLevel(level)"
          >
            {{ level }}
          </button>
        </div>

        <div class="mallnav__zoom">
          <button aria-label="Zoom out" @click="step(1 / 1.4)">−</button>
          <button aria-label="Zoom in" @click="step(1.4)">+</button>
          <button class="wide" @click="reset">Reset</button>
        </div>
      </div>

      <div ref="containerRef" class="mallnav__canvas" />

      <div class="mallnav__under">
        <div class="mallnav__card" :class="{ empty: !selected }">
          <template v-if="selected">
            <div class="mallnav__card-head">
              <strong>{{ selected.title }}</strong>
              <span class="mallnav__chip">Unit {{ selected.unit }}</span>
              <button class="mallnav__link" @click="copyLink">
                {{ copied ? 'Link copied' : 'Copy link' }}
              </button>
              <button class="mallnav__close" aria-label="Clear" @click="clear">×</button>
            </div>
            <div class="mallnav__card-grid">
              <span>Category</span><span>{{ selected.category }}</span>
              <span>Level</span><span>{{ selected.level }}</span>
              <span>Hours</span><span>{{ selected.hours }}</span>
              <span>Route</span>
              <span class="muted">
                Information desk (Level 1) → {{ selected.title }}
                <template v-if="selected.level !== 1">
                  · escalator to level {{ selected.level }}
                </template>
              </span>
            </div>
          </template>
          <p v-else class="muted">
            Pick a shop from the list or click it on the plan. The directory stands at the
            information desk on level 1 — that point is the start of every route.
          </p>
        </div>

        <details class="mallnav__legend" :open="!narrow">
          <summary>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              <path fill="currentColor" d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z" />
            </svg>
            Legend
          </summary>
          <dl>
            <div v-for="item in LEGEND" :key="item.label">
              <dt v-html="item.svg" />
              <dd>{{ item.label }}</dd>
            </div>
          </dl>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import type { SvgicItem } from '@svgic/core'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'
import type { ZoomPluginInstance } from '@svgic/core/plugins/zoom'
import { ContentPlugin } from '@svgic/core/plugins/content'
import { LEVELS, TENANTS, planSrc, tenantsOf, type Tenant } from '../../data/mall'

/** Facility icons, so the badges on the plan mean something */
const LEGEND = [
  { label: 'Escalator', svg: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M21 5h-4.2l-6.2 12H7v-2h2.4l6.2-12H21zM3 17h2v2H3z"/></svg>' },
  { label: 'Lift', svg: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="m7 2l4 4H8v4H6V6H3zm10 8l-4-4h3V2h2v4h3zM6 12h12v10H6z"/></svg>' },
  { label: 'Stairs', svg: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15 5v4h-4v4H7v4H3v3h7v-4h4v-4h4V8h4V5z"/></svg>' },
  { label: 'Restrooms', svg: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5.5 2a2 2 0 1 1 0 4a2 2 0 0 1 0-4M8 22v-6H6.5v-5A1.5 1.5 0 0 1 8 9.5h-5A1.5 1.5 0 0 1 4.5 11v5H3v6zm10.5-20a2 2 0 1 1 0 4a2 2 0 0 1 0-4M17 22v-7h2l-2.5-7h3L17 22z"/></svg>' },
  { label: 'ATM', svg: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M8 9v1.5h2.25V15h1.5v-4.5H14V9zM4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2"/></svg>' },
  { label: 'Information', svg: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20a10 10 0 0 0 0-20m1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>' },
  { label: 'Entrance', svg: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10 13H8v-2h2zm11 6v2H3v-2h1V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14h2V9h2a2 2 0 0 1 2 2v8z"/></svg>' },
]

const containerRef = ref<HTMLElement>()
const query = ref('')
const category = ref('')
const current = ref<number>(1)
const selected = ref<Tenant | null>(null)
const copied = ref(false)
const narrow = ref(false)

let client: Svgic | null = null
let zoom: ZoomPluginInstance | null = null
let media: MediaQueryList | null = null

/** On a phone the result list only earns its space while you are searching */
const searching = computed(() => query.value.trim() !== '' || category.value !== '')

const categories = computed(() =>
  [...new Set(TENANTS.map((t) => t.category))].sort((a, b) => a.localeCompare(b)),
)

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  const searching = q.length > 0 || category.value !== ''
  const base = searching ? TENANTS : tenantsOf(current.value)

  return base
    .filter((t) => !category.value || t.category === category.value)
    .filter((t) => !q || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    .slice(0, 60)
})

const label = (item: Tenant | null) => item?.title
const unitNo = (item: Tenant | null) => item?.unit

const contentChain = () => [
  {
    type: 'image' as const,
    href: ({ item }: { item: Tenant | null }) => item?.logo,
    ratio: ({ item }: { item: Tenant | null }) => item?.ratio,
    minHeight: 20,
    scale: 0.86,
  },
  { type: 'text' as const, text: ({ item }) => label(item as Tenant), fill: 'var(--plan-ink)', fontWeight: 600 },
  {
    type: 'text' as const,
    text: ({ item }) => (label(item as Tenant) ?? '').split(' '),
    fill: 'var(--plan-ink)',
    fontWeight: 600,
    lineHeight: 1.1,
  },
  { type: 'text' as const, text: ({ item }) => unitNo(item as Tenant), fill: 'var(--plan-ink)', opacity: 0.5 },
]

/**
 * The hover card.
 *
 * A directory entry, not a summary of the shape: the logo the plan may have had
 * no room for, the category, the level and the opening hours. Placed at the
 * cursor, the way a tooltip on a map is.
 */
const renderPopup = (item: SvgicItem): HTMLElement => {
  const tenant = item as Tenant
  const box = document.createElement('div')

  box.className = 'mall-pop'

  if (tenant.logo) {
    const logo = document.createElement('img')

    logo.className = 'mall-pop__logo'
    logo.src = tenant.logo
    logo.alt = ''
    box.appendChild(logo)
  }

  const title = document.createElement('div')

  title.className = 'mall-pop__title'
  title.textContent = tenant.title
  box.appendChild(title)

  const meta = document.createElement('div')

  meta.className = 'mall-pop__meta'
  meta.textContent = `${tenant.category} · Level ${tenant.level} · Unit ${tenant.unit}`
  box.appendChild(meta)

  if (tenant.hours) {
    const hours = document.createElement('div')

    hours.className = 'mall-pop__hours'
    hours.textContent = tenant.hours
    box.appendChild(hours)
  }

  return box
}

const mount = async () => {
  zoom = ZoomPlugin({ wheelMode: 'ctrl', minScale: 0.7, maxScale: 6, animate: true })

  client = new Svgic(containerRef.value!, {
    src: planSrc(current.value),
    layers: {
      units: { role: 'interactive' },
      kiosks: { role: 'interactive' },
      nav: { role: 'data' },
    },
    data: tenantsOf(current.value),
    plugins: [
      zoom,
      ContentPlugin({ sourceLayer: 'units', fontScale: 42, content: contentChain() }),
      ContentPlugin({
        sourceLayer: 'kiosks',
        fontScale: 70,
        padding: 0.04,
        content: [{ type: 'text', text: ({ item }) => label(item as Tenant), fill: 'var(--plan-ink)' }],
      }),
    ],
    popup: {
      placement: 'cursor',
      offset: { x: 18, y: 18 },
      render: renderPopup,
    },
    style: {
      default: { cursor: 'pointer', transition: 'fill 0.15s, stroke 0.15s' },
      hover: { fill: 'var(--plan-hover)' },
      states: {
        // Literal colours: the plan defines its palette on the <svg>, so a value
        // derived from it cannot be built on an ancestor — see the notes below.
        found: { fill: 'var(--plan-found)', stroke: 'var(--plan-accent)', strokeWidth: 3 },
      },
    },
  })

  await client.ready

  client.on('click', (id, item) => {
    select((item as Tenant | null) ?? null, id)
  })
}

/**
 * The selection lives in the address bar, so a shop can be linked to. Written
 * with replaceState: a directory is one screen, and filling the history with
 * every tap would turn Back into a chore.
 */
const syncUrl = (tenant: Tenant | null) => {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)

  if (tenant) url.searchParams.set('shop', tenant.id)
  else url.searchParams.delete('shop')

  window.history.replaceState(null, '', url)
}

const select = (tenant: Tenant | null, id: string | null) => {
  selected.value = tenant
  copied.value = false
  client?.clearHighlight()

  if (id) client?.setHighlight('found', [id])

  syncUrl(tenant)
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

const setLevel = async (level: number) => {
  if (!client || level === current.value) return

  current.value = level
  selected.value = null

  await client.setSrc(planSrc(level))
  client.setData(tenantsOf(level))
}

const goTo = async (tenant: Tenant) => {
  await setLevel(tenant.level)
  select(tenant, tenant.id)
  // The whole-floor view is a thumbnail on a phone, so the flight in goes deeper
  zoom?.focusElement(tenant.id, { scale: narrow.value ? 3.4 : 2.4 })
}

const step = (factor: number) => {
  const scale = (zoom?.getState().scale ?? 1) * factor

  zoom?.zoomTo(Math.min(6, Math.max(0.7, scale)))
}

const clear = () => {
  selected.value = null
  client?.clearHighlight()
}

const reset = () => {
  clear()
  zoom?.reset()
}

/** Opens the shop named in ?shop=, so a shared link lands on the right floor */
const openFromUrl = async () => {
  if (typeof window === 'undefined') return

  const id = new URL(window.location.href).searchParams.get('shop')
  const tenant = id ? TENANTS.find((t) => t.id === id) : null

  if (tenant) await goTo(tenant)
}

onMounted(async () => {
  media = window.matchMedia('(max-width: 900px)')
  narrow.value = media.matches
  media.addEventListener('change', onMediaChange)

  await mount()
  await openFromUrl()
})

function onMediaChange(event: MediaQueryListEvent) {
  narrow.value = event.matches
}

onUnmounted(() => {
  media?.removeEventListener('change', onMediaChange)
  client?.destroy()
})
</script>

<style scoped>
.mallnav {
  display: grid;
  grid-template-columns: 268px minmax(0, 1fr);
  grid-template-areas: 'side main';
  gap: 16px;
  align-items: start;
}
.mallnav__side { grid-area: side; }
.mallnav__main { grid-area: main; }

/*
 * On a phone the map comes first and the search sits above it. The result list
 * would otherwise push the plan off the screen, so it only appears while a query
 * or a category is active — which is also when it is the thing you are reading.
 */
@media (max-width: 900px) {
  .mallnav {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'side' 'main';
    gap: 10px;
  }
  .mallnav__results { display: none; }
  .mallnav.searching .mallnav__results { display: block; max-height: 46vh; }
  .mallnav__filters { grid-template-columns: 1fr auto; }
  .mallnav__filters select { max-width: 42vw; }
}

/* ---- sidebar ---- */
.mallnav__side {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}
.mallnav__filters {
  display: grid;
  gap: 8px;
  padding: 10px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.mallnav__filters input,
.mallnav__filters select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
}
.mallnav__results { list-style: none; margin: 0; padding: 6px; max-height: 430px; overflow: auto; }
.mallnav__results button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.mallnav__results button:hover { background: var(--vp-c-bg-mute); }
.mallnav__results button.active { background: var(--vp-c-brand-soft); }
.mallnav__name { display: block; font-size: 13px; font-weight: 600; }
.mallnav__meta { display: block; font-size: 11px; color: var(--vp-c-text-3); }
.mallnav__empty { padding: 12px; font-size: 13px; color: var(--vp-c-text-3); }

/* ---- map ---- */
.mallnav__bar { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
.mallnav__levels, .mallnav__zoom { display: flex; gap: 6px; }
.mallnav__zoom { margin-left: auto; }
.mallnav__bar button {
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  cursor: pointer;
}
.mallnav__bar button span { color: var(--vp-c-text-3); margin-left: 4px; }
.mallnav__bar button:hover { background: var(--vp-c-bg-mute); }
.mallnav__bar button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}
.mallnav__bar button.active span { color: var(--vp-c-brand-1); opacity: 0.75; }
.mallnav__zoom button { min-width: 34px; }

.mallnav__canvas {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
}
.mallnav__canvas :deep(svg) { display: block; width: 100%; height: auto; }
/*
 * The palette lives on the <svg> itself, so the derived interaction colours have
 * to be declared there too — a rule on an ancestor cannot read them.
 */
.mallnav__canvas :deep(.mall-plan) {
  --plan-hover: color-mix(in srgb, var(--plan-accent) 22%, var(--plan-unit));
  --plan-found: color-mix(in srgb, var(--plan-accent) 55%, var(--plan-unit));
}

/* ---- under the map ---- */
.mallnav__under {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin-top: 12px;
  align-items: start;
}
@media (max-width: 720px) {
  .mallnav__under { grid-template-columns: 1fr; }
}

.mallnav__card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  padding: 12px 14px;
  min-height: 104px;
}
.mallnav__card.empty { display: flex; align-items: center; }
.mallnav__card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.mallnav__card-head strong { font-size: 15px; }
.mallnav__chip {
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
  padding: 2px 7px;
  border-radius: 99px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-3);
}
.mallnav__close {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.mallnav__card-grid {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 4px 12px;
  font-size: 12.5px;
}
.mallnav__card-grid span:nth-child(odd) { color: var(--vp-c-text-3); }
.muted { color: var(--vp-c-text-3); font-size: 12.5px; margin: 0; }

.mallnav__legend {
  padding: 12px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
/* A bare word does not read as something you can open, so the summary gets a
   chevron that turns — the affordance the default marker was providing. */
.mallnav__legend summary {
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
.mallnav__legend summary::-webkit-details-marker { display: none; }
.mallnav__legend summary svg {
  color: var(--vp-c-brand-1);
  transition: transform 0.18s;
}
.mallnav__legend[open] summary svg { transform: rotate(180deg); }
.mallnav__legend[open] summary { margin-bottom: 8px; }
.mallnav__legend summary:hover { color: var(--vp-c-brand-1); }
.mallnav__legend dl {
  display: grid;
  grid-template-columns: repeat(2, auto);
  gap: 4px 14px;
  margin: 0;
}
.mallnav__legend > dl > div { display: flex; align-items: center; gap: 7px; }
.mallnav__legend dt { display: flex; color: var(--vp-c-brand-1); }
.mallnav__legend dd { margin: 0; font-size: 12px; color: var(--vp-c-text-2); }

.mallnav__link {
  border: 1px solid var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-3);
  border-radius: 99px;
  padding: 2px 9px;
  font-size: 11px;
  cursor: pointer;
}
.mallnav__link:hover { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); }
</style>

<!--
  The popup is mounted on document.body by the library, so its styles cannot be
  scoped to this component — a scoped rule would never reach it.
-->
<style>
.mall-pop {
  position: absolute;
  z-index: 60;
  width: max-content;
  max-width: 240px;
  padding: 9px 11px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg-elv, var(--vp-c-bg));
  box-shadow: 0 6px 22px rgb(0 0 0 / 22%);
  color: var(--vp-c-text-1);
  /* It follows the cursor, so it must never be under it */
  pointer-events: none;
}
.mall-pop__logo { display: block; max-width: 116px; max-height: 34px; margin-bottom: 7px; }
.mall-pop__title { font-weight: 600; font-size: 13.5px; }
.mall-pop__meta { margin-top: 2px; font-size: 11.5px; color: var(--vp-c-text-3); }
.mall-pop__hours {
  margin-top: 5px;
  font-size: 11.5px;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-2);
}
</style>
