# Popup — Cursor

The popup follows the cursor. Hover over rooms to see it in action.

## Simple

Shows `item.title` by default. Flips automatically if it overflows the viewport edge.

<DemoBlock label="popup: { placement: 'cursor' }">
  <PopupCursorDemo mode="simple" />
</DemoBlock>

```ts
new Svgic('#container', {
  popup: { placement: 'cursor' },
})
```

## Custom render

Full control over popup content via a `render` function.

<DemoBlock label="popup: { placement: 'cursor', render(item) { ... } }">
  <PopupCursorDemo mode="custom" />
</DemoBlock>

```ts
new Svgic('#container', {
  popup: {
    placement: 'cursor',
    render(item) {
      const el = document.createElement('div')
      const title = document.createElement('div')
      title.textContent = item.title ?? ''
      const desc = document.createElement('div')
      desc.textContent = item.description ?? ''
      el.append(title, desc)
      return el
    },
  },
})
```

`render` receives a `SvgicItem` and returns an `HTMLElement` or HTML string.

::: warning XSS
If data comes from an untrusted source, do not use `innerHTML` — use `textContent` instead,
or sanitize with [DOMPurify](https://github.com/cure53/DOMPurify).
:::

## Options

| Option        | Type                              | Default          | Description                                    |
|---------------|-----------------------------------|------------------|------------------------------------------------|
| `placement`   | `'cursor'`                        | —                | Follow the cursor                              |
| `offset`      | `{ x: number, y: number }`        | `{ x:16, y:16 }` | Offset from cursor                             |
| `render`      | `(item) => HTMLElement \| string` | —                | Custom popup content                           |
| `template`    | `string \| HTMLTemplateElement`   | —                | HTML template (alternative to render)          |
| `bind`        | `(el, item) => void`              | —                | Bind data into template                        |
| `hideDelay`   | `number`                          | `0`              | Delay before hiding (ms)                       |
| `interactive` | `boolean`                         | `false`          | Keep popup visible when cursor moves onto it   |

<script setup>
import PopupCursorDemo from '../../.vitepress/theme/components/demos/PopupCursorDemo.vue'
</script>
