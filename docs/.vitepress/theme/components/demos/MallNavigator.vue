<template>
  <div class="mallnav">
    <aside class="mallnav__side">
      <div class="mallnav__search">
        <input
          v-model="query"
          type="search"
          placeholder="Find a shop"
          aria-label="Find a shop"
        />
      </div>

      <ul class="mallnav__results">
        <li v-if="!results.length" class="mallnav__empty">Nothing found</li>
        <li v-for="tenant in results" :key="tenant.id">
          <button
            :class="{ active: selected?.id === tenant.id }"
            @click="goTo(tenant)"
          >
            <span class="mallnav__name">{{ tenant.title }}</span>
            <span class="mallnav__meta">{{ tenant.category }} · L{{ tenant.level }}</span>
          </button>
        </li>
      </ul>
    </aside>

    <div class="mallnav__map">
      <div class="mallnav__levels">
        <button
          v-for="level in LEVELS"
          :key="level"
          :class="{ active: level === current }"
          @click="setLevel(level)"
        >
          {{ level }}
        </button>
        <button class="mallnav__reset" @click="reset">Reset view</button>
      </div>

      <div ref="containerRef" class="mallnav__canvas" />

      <transition name="fade">
        <div v-if="selected" class="mallnav__card">
          <div class="mallnav__card-head">
            <strong>{{ selected.title }}</strong>
            <button class="mallnav__close" aria-label="Close" @click="clear">×</button>
          </div>
          <div class="mallnav__card-row">{{ selected.category }}</div>
          <div class="mallnav__card-row">Unit {{ selected.unit }} · Level {{ selected.level }}</div>
          <div class="mallnav__card-row muted">{{ selected.hours }}</div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Svgic } from '@svgic/core'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'
import type { ZoomPluginInstance } from '@svgic/core/plugins/zoom'
import { ContentPlugin } from '@svgic/core/plugins/content'
import { LEVELS, TENANTS, planSrc, tenantsOf, type Tenant } from '../../data/mall'

const containerRef = ref<HTMLElement>()
const query = ref('')
const current = ref<number>(1)
const selected = ref<Tenant | null>(null)

let client: Svgic | null = null
let zoom: ZoomPluginInstance | null = null

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = q
    ? TENANTS.filter(
        (t) => t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
      )
    : tenantsOf(current.value)

  return list.slice(0, 40)
})

/** Labels follow the page theme through the plan's own custom properties */
const contentChain = () => [
  {
    type: 'image' as const,
    href: ({ item }: { item: Tenant | null }) => item?.logo,
    ratio: ({ item }: { item: Tenant | null }) => item?.ratio,
    minHeight: 20,
    scale: 0.86,
  },
  {
    type: 'text' as const,
    text: ({ item }: { item: Tenant | null }) => item?.title,
    fill: 'var(--plan-ink)',
    fontWeight: 600,
  },
  {
    type: 'text' as const,
    text: ({ item }: { item: Tenant | null }) => (item?.title ?? '').split(' '),
    fill: 'var(--plan-ink)',
    fontWeight: 600,
    lineHeight: 1.1,
  },
  {
    type: 'text' as const,
    text: ({ item }: { item: Tenant | null }) => item?.unit,
    fill: 'var(--plan-ink)',
    opacity: 0.55,
  },
]

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
        content: [
          {
            type: 'text',
            text: ({ item }) => (item as Tenant | null)?.title,
            fill: 'var(--plan-ink)',
          },
        ],
      }),
    ],
    style: {
      default: { cursor: 'pointer', transition: 'fill 0.15s' },
      hover: { fill: 'var(--plan-hover)' },
      states: {
        found: { fill: 'var(--plan-found)', stroke: 'var(--plan-accent)', strokeWidth: 2.5 },
      },
    },
  })

  await client.ready

  client.on('click', (id, item) => {
    selected.value = (item as Tenant | null) ?? null

    if (id) {
      client?.clearHighlight()
      client?.setHighlight('found', [id])
    }
  })
}

const setLevel = async (level: number) => {
  if (!client || level === current.value) return

  current.value = level
  selected.value = null

  await client.setSrc(planSrc(level))
  // setSrc drops the bound data, so the floor's tenants go back in
  client.setData(tenantsOf(level))
}

const goTo = async (tenant: Tenant) => {
  await setLevel(tenant.level)

  selected.value = tenant
  client?.clearHighlight()
  client?.setHighlight('found', [tenant.id])
  zoom?.focusElement(tenant.id, { scale: 2.6 })
}

const clear = () => {
  selected.value = null
  client?.clearHighlight()
}

const reset = () => {
  clear()
  zoom?.reset()
}

onMounted(() => {
  void mount()
})

onUnmounted(() => client?.destroy())
</script>

<style scoped>
.mallnav {
  display: grid;
  grid-template-columns: 264px 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 860px) {
  .mallnav { grid-template-columns: 1fr; }
}

.mallnav__side {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}
.mallnav__search { padding: 10px; border-bottom: 1px solid var(--vp-c-divider); }
.mallnav__search input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 7px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
}
.mallnav__results { list-style: none; margin: 0; padding: 6px; max-height: 460px; overflow: auto; }
.mallnav__results button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 7px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  cursor: pointer;
  color: var(--vp-c-text-1);
}
.mallnav__results button:hover { background: var(--vp-c-bg-mute); }
.mallnav__results button.active { background: var(--vp-c-brand-soft); }
.mallnav__name { display: block; font-size: 13px; font-weight: 600; }
.mallnav__meta { display: block; font-size: 11px; color: var(--vp-c-text-3); }
.mallnav__empty { padding: 12px; font-size: 13px; color: var(--vp-c-text-3); }

.mallnav__map { position: relative; }
.mallnav__levels { display: flex; gap: 6px; margin-bottom: 8px; }
.mallnav__levels button {
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
.mallnav__levels button:hover { background: var(--vp-c-bg-mute); }
.mallnav__levels button.active {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}
.mallnav__reset { margin-left: auto; }

.mallnav__canvas {
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  /* the plan carries its own palette; these two are for the interaction states */
  --plan-hover: color-mix(in srgb, var(--plan-accent) 26%, var(--plan-unit));
  --plan-found: color-mix(in srgb, var(--plan-accent) 42%, var(--plan-unit));
}
.mallnav__canvas :deep(svg) { display: block; width: 100%; height: auto; }

.mallnav__card {
  position: absolute;
  right: 14px;
  bottom: 14px;
  width: 216px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
}
.mallnav__card-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.mallnav__card-head strong { font-size: 14px; }
.mallnav__close {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
}
.mallnav__card-row { font-size: 12px; color: var(--vp-c-text-2); }
.mallnav__card-row.muted { color: var(--vp-c-text-3); margin-top: 4px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
