# Popup — Target

The popup renders into a specified DOM node instead of floating over the map.
Useful for mobile interfaces — information appears in a fixed panel, not on top of the diagram.

Click a room to see the info appear in the panel on the right.

<DemoBlock>
  <PopupTargetDemo />
</DemoBlock>

<script setup>
import PopupTargetDemo from '../../.vitepress/theme/components/demos/PopupTargetDemo.vue'
</script>

## Usage

```ts
new Svgic('#container', {
  popup: {
    placement: 'target',
    target: '#info-panel',  // CSS selector or HTMLElement
    trigger: 'click',       // recommended for mobile
    render(item) {
      const el = document.createElement('div')
      // build your panel content
      return el
    },
  },
})
```

`target` accepts a CSS selector string or an `HTMLElement` directly.

## Options

| Option      | Type                              | Default   | Description                           |
|-------------|-----------------------------------|-----------|---------------------------------------|
| `placement` | `'target'`                        | —         | Render into a DOM node                |
| `target`    | `string \| HTMLElement`           | —         | Target element (required)             |
| `trigger`   | `'hover' \| 'click'`              | `'hover'` | Open on hover or click                |
| `render`    | `(item) => HTMLElement \| string` | —         | Custom popup content                  |
| `template`  | `string \| HTMLTemplateElement`   | —         | HTML template (alternative to render) |
| `bind`      | `(el, item) => void`              | —         | Bind data into template               |
