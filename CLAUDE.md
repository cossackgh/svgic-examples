# svgic-examples — контекст для Claude

## Что это

VitePress сайт с интерактивными примерами для библиотеки `@svgic/core`.
Цель — помочь разработчикам быстро разобраться в возможностях библиотеки через живые демо.

Репозиторий сайта: https://github.com/cossackgh/svgic-examples
Репозиторий библиотеки: https://github.com/cossackgh/client-svg-schemas

## Что такое @svgic/core

Интерактивный SVG-клиент. Встраивает SVG в DOM, привязывает слои к данным,
обрабатывает события (hover, click), расширяется через плагины.
Работает с vanilla JS/TS, Vue 3 и React (есть адаптеры).

## Технологии

- **VitePress** — фреймворк для сайта
- **Vue 3** — VitePress работает на Vue, живые демо — нативные Vue-компоненты
- **TypeScript** — везде где возможно
- **@svgic/core** — демонстрируемая библиотека

## Структура docs/

```
docs/
  index.md                      # главная
  getting-started.md            # быстрый старт
  examples/
    basic.md                    # базовое подключение
    events.md                   # click / hover / leave
    popup/
      cursor.md                 # popup: cursor
      element.md                # popup: element (anchor)
      target.md                 # popup: target (мобайл-панель)
      template.md               # template + bind
    styling.md                  # style + setHighlight
    id-matching.md              # idAttribute / idMatch: suffix
    zoom.md                     # ZoomPlugin
    debug.md                    # DebugPlugin
    custom-plugin.md            # свой плагин
  frameworks/
    vue.md                      # SvgicVue + useSvgic
    react.md                    # SvgicReact + useSvgic
  .vitepress/
    theme/
      index.ts                  # кастомная тема
      components/               # Vue-компоненты живых демо
    config.mts
  public/
    svgs/                       # SVG-файлы для примеров
```

## Принцип каждой страницы

Каждый пример — живой Vue-компонент прямо в markdown + код под ним.
Демо видно сразу, без отдельного запуска.

## Ключевые возможности библиотеки

### Инициализация
```ts
const client = new Svgic('#container', {
  src: '/map.svg',
  layers: { rooms: { role: 'interactive' } },
  data: [{ id: 'room-101', title: 'Conference Room' }],
})
await client.ready
```

### События
```ts
client.on('click', (id, item) => {})
client.on('hover', (id, item) => {})
client.on('leave', (id, item) => {})
```

### Popup
```ts
// cursor / element / target
popup: { placement: 'cursor' }
popup: { placement: 'element', anchor: 'top-center' }
popup: { placement: 'target', target: '#info-panel' }
// кастомный рендер
popup: { render(item) { return document.createElement('div') } }
// template + bind
popup: { template: '#tpl', bind(el, item) {} }
// триггер по клику
popup: { trigger: 'click' }
```

### Стилизация и highlight
```ts
style: {
  default: { fill: '#2d2d52', cursor: 'pointer' },
  hover:   { fill: '#4a4a80' },
  states:  { free: { fill: '#1a4731' }, busy: { fill: '#4a1e1e' } },
}
client.setHighlight('free', ['room-101'])
client.clearHighlight('free')
client.clearHighlight()
```

### ID Matching
```ts
// кастомный атрибут
new Svgic('#c', { idAttribute: 'data-svgic-id' })
// суффиксы Inkscape/Illustrator (_2, _3, ...)
new Svgic('#c', { idMatch: 'suffix' })
```

### ZoomPlugin
```ts
import { ZoomPlugin } from 'svgic/plugins/zoom'
const zoom = ZoomPlugin({ wheelMode: 'ctrl', minScale: 0.5, maxScale: 8 })
// zoom.zoomTo(3), zoom.panTo(x, y), zoom.focusElement('id'), zoom.reset()
```

### DebugPlugin (только dev)
```ts
import { DebugPlugin } from 'svgic/plugins/debug'
DebugPlugin({ showOn: 'hover' | 'click' | 'both' })
```

### Плагины — хуки
```ts
{
  name: 'my-plugin',
  onInit(client) {},
  onDestroy(client) {},
  onElementHover(el, item) { return false }, // отменить дефолтное поведение
  onElementLeave(el, item) {},
  onElementClick(el, item) {},
}
```

### Vue 3
```vue
<SvgicVue src="/map.svg" :layers="{}" :data="items" @click="onRoomClick" />
```
```ts
const { containerRef, client } = useSvgic({ src: '/map.svg', ... })
```

### React
```tsx
<SvgicReact src="/map.svg" layers={{}} data={rooms} onClick={(id, item) => {}} />
```
```tsx
const { containerRef, client } = useSvgic({ src: '/map.svg', ... })
```

## Важные детали

- SVG слои — через `<g id="...">` где id совпадает с ключом в `layers`
- Интерактивные элементы — прямые дочерние `<g id="...">` интерактивного слоя
- `await client.ready` — обязательно перед вызовами API
- `client.destroy()` — очищает listener'ы и контейнер
- В React prop для стилей называется `styleConfig` (не `style` — конфликт с нативным)
- XSS предупреждение: не использовать `innerHTML` с данными из ненадёжных источников
