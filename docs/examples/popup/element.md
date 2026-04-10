# Popup — Element

The popup is anchored to the SVG element itself.
Switch anchor positions with the buttons — hover over any room to see the result.

<DemoBlock>
  <PopupElementDemo />
</DemoBlock>

<script setup>
import PopupElementDemo from '../../.vitepress/theme/components/demos/PopupElementDemo.vue'
</script>

## Usage

```ts
new Svgic('#container', {
  popup: {
    placement: 'element',
    anchor: 'top-center', // where to anchor relative to the element
    offset: { x: 0, y: -8 },
    flip: true,           // auto-flip if overflowing viewport edge (default: true)
  },
})
```

## Anchor values

| Value           | Position                        |
|-----------------|---------------------------------|
| `top-center`    | Above, centered                 |
| `top-left`      | Above, aligned to left edge     |
| `top-right`     | Above, aligned to right edge    |
| `top`           | Above, aligned to cursor X      |
| `bottom-center` | Below, centered                 |
| `bottom`        | Below, aligned to cursor X      |
| `left`          | Left side, centered vertically  |
| `right`         | Right side, centered vertically |
| `center`        | Over the element, centered      |

## Options

| Option        | Type                              | Default       | Description                                  |
|---------------|-----------------------------------|---------------|----------------------------------------------|
| `placement`   | `'element'`                       | —             | Anchor to element                            |
| `anchor`      | see table above                   | `'top-center'`| Anchor position                              |
| `offset`      | `{ x: number, y: number }`        | `{ x:0, y:0 }`| Offset from anchor point                     |
| `flip`        | `boolean`                         | `true`        | Auto-flip if overflowing viewport            |
| `render`      | `(item) => HTMLElement \| string` | —             | Custom popup content                         |
| `template`    | `string \| HTMLTemplateElement`   | —             | HTML template (alternative to render)        |
| `bind`        | `(el, item) => void`              | —             | Bind data into template                      |
| `trigger`     | `'hover' \| 'click'`              | `'hover'`     | Open on hover or click                       |
| `hideDelay`   | `number`                          | `0`           | Delay before hiding (ms)                     |
| `interactive` | `boolean`                         | `false`       | Keep popup visible when cursor moves onto it |
