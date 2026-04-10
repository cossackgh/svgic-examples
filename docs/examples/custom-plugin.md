# Custom Plugin

Plugins extend Svgic behavior via lifecycle hooks.
This demo implements a **selection plugin** — click a room to select it (blue outline), click again to deselect. All hook calls are logged below the map.

<DemoBlock>
  <CustomPluginDemo />
</DemoBlock>

<script setup>
import CustomPluginDemo from '../.vitepress/theme/components/demos/CustomPluginDemo.vue'
</script>

## Plugin structure

```ts
import type { SvgicPlugin } from '@svgic/core'

const myPlugin: SvgicPlugin = {
  name: 'my-plugin', // required, used for debugging

  onInit(client) {
    // called after SVG is loaded and data is bound
    // client — the Svgic instance
  },

  onDestroy(client) {
    // called when client.destroy() is invoked
    // use to clean up any side effects
  },

  onElementHover(el, item) {
    // el   — the SVG <g> element
    // item — bound SvgicItem or null
    el.setAttribute('data-hovered', 'true')
  },

  onElementLeave(el, item) {
    el.removeAttribute('data-hovered')
  },

  onElementClick(el, item) {
    // return false to cancel the default 'click' event
    doSomething(el, item)
    return false
  },
}

client.use(myPlugin)
// or pass in config:
new Svgic('#container', { plugins: [myPlugin] })
```

## Hook reference

| Hook | When called | `return false` |
|------|-------------|----------------|
| `onInit(client)` | after SVG loaded + data bound | — |
| `onDestroy(client)` | when `destroy()` is called | — |
| `onElementHover(el, item)` | cursor enters element | cancels `hover` event |
| `onElementLeave(el, item)` | cursor leaves element | cancels `leave` event |
| `onElementClick(el, item)` | element clicked | cancels `click` event |

## Cancelling default behavior

Return `false` from a hook to prevent Svgic from emitting the corresponding event.
Useful when a plugin fully owns the interaction (custom popup, selection, etc.):

```ts
onElementClick(el, item) {
  myCustomHandler(el, item)
  return false // client.on('click', ...) will NOT fire
},
```

## Cancelling the built-in popup

```ts
const myPopupPlugin: SvgicPlugin = {
  name: 'my-popup',

  onElementHover(el, item) {
    MyPopup.show(item, el.getBoundingClientRect())
    return false // cancels the built-in popup
  },

  onElementLeave(el) {
    MyPopup.hide()
    return false
  },
}
```
