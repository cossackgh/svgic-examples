# ID Matching

By default, `item.id` is matched against the SVG element's `id` attribute exactly.
Two options let you handle real-world cases where SVG editors rename IDs.

<DemoBlock>
  <IdMatchingDemo />
</DemoBlock>

<script setup>
import IdMatchingDemo from '../.vitepress/theme/components/demos/IdMatchingDemo.vue'
</script>

## Default: exact match

```ts
new Svgic('#container', {
  data: [{ id: 'room-101', title: 'Conference Room' }],
})
```

```xml
<!-- SVG element must have exactly id="room-101" -->
<g id="room-101"> ... </g>
```

## idMatch: 'suffix'

Inkscape and Illustrator append numeric suffixes when IDs conflict during export (`_2`, `_3`, `_1_`…).
`idMatch: 'suffix'` strips these automatically — exact match is tried first, suffix stripping is a fallback.

```ts
new Svgic('#container', {
  idMatch: 'suffix',
  data: [{ id: 'room-101', title: 'Conference Room' }],
})
```

```xml
<!-- SVG element exported with a suffix — still matches -->
<g id="room-101_2"> ... </g>
```

A `console.warn` lists all auto-matched elements so you're aware:

```
[svgic] 2 element(s) matched by suffix stripping:
  "room-101_2" → "room-101"
  "room-102_1" → "room-102"
```

## idAttribute

Use a custom attribute as the binding key instead of `id`.
Useful when the SVG `id` is unstable (gets renamed on re-export) but a custom attribute is stable.

```ts
new Svgic('#container', {
  idAttribute: 'data-svgic-id',
  data: [{ id: 'shop-034', title: 'Coffee Shop' }],
})
```

```xml
<!-- id can change, data-svgic-id is stable -->
<g id="shop-034_2" data-svgic-id="shop-034"> ... </g>
```

## Combining both

`idAttribute` and `idMatch` can be used together:

```ts
new Svgic('#container', {
  idAttribute: 'data-svgic-id',
  idMatch: 'suffix',
})
```
