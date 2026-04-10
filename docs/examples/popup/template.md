# Popup — Template + bind

An alternative to `render` — define the popup markup in HTML, bind data separately in JS.
Useful when designers manage the HTML template independently from the JS initialization code.

Hover over rooms to see the popup.

<DemoBlock>
  <PopupTemplateDemo />
</DemoBlock>

<script setup>
import PopupTemplateDemo from '../../.vitepress/theme/components/demos/PopupTemplateDemo.vue'
</script>

## Usage

Define the template in HTML:

```html
<template id="room-popup">
  <div class="room-popup">
    <div class="room-popup__title"></div>
    <div class="room-popup__desc"></div>
    <div class="room-popup__floor"></div>
  </div>
</template>
```

Pass the selector and a `bind` function:

```ts
new Svgic('#container', {
  popup: {
    placement: 'cursor',
    template: '#room-popup',  // CSS selector or HTMLTemplateElement
    bind(el, item) {
      el.querySelector('.room-popup__title').textContent = item.title ?? ''
      el.querySelector('.room-popup__desc').textContent  = item.description ?? ''
      el.querySelector('.room-popup__floor').textContent = `Floor ${item.floor}`
    },
  },
})
```

`bind` receives the cloned template element and the bound `SvgicItem`.
Using `textContent` instead of `innerHTML` is safe by default — no XSS risk.

## Passing HTMLTemplateElement directly

```ts
const tpl = document.querySelector('#room-popup')

new Svgic('#container', {
  popup: {
    placement: 'element',
    anchor: 'top-center',
    template: tpl,
    bind(el, item) { ... },
  },
})
```

## template vs render

| | `render` | `template + bind` |
|---|---|---|
| Markup defined in | JS | HTML |
| XSS-safe by default | no (`innerHTML`) | yes (`textContent` in bind) |
| Designer-friendly | — | yes |
| Dynamic markup | yes | no |
