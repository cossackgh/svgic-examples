# ContentPlugin

Puts text, images and composite content **inside** the shapes of a layer, positioned from the geometry of each shape.

The center of a bounding box is no use here: in the L- and U-shaped units that make up most of a real plan it lands on a wall, or outside the shape entirely. The plugin samples the fill instead and places content at the point furthest from the boundary, or in the largest rectangle that fits.

Switch between the modes below — the same plan, four different content chains.

<DemoBlock>
  <ContentDemo />
</DemoBlock>

<script setup>
import ContentDemo from '../.vitepress/theme/components/demos/ContentDemo.vue'
</script>

## Setup

```ts
import { Svgic } from '@svgic/core'
import { ContentPlugin } from '@svgic/core/plugins/content'

const content = ContentPlugin({
  sourceLayer: 'units',
  content: [
    { type: 'text', text: ({ item }) => item?.title as string },
    { type: 'text', text: ({ id }) => id, opacity: 0.5 },
  ],
})

const client = new Svgic('#container', {
  src: '/mall.svg',
  layers: { units: { role: 'interactive' } },
  data: units,
  plugins: [content],
})
```

The generated layer ignores pointer events, so hover and click keep reaching the shapes underneath, and every piece of content is clipped to the shape it belongs to.

Content follows the data on its own: the plugin redraws on every `setData()`, so there is nothing to call by hand after loading a new floor.

## The candidate chain

Candidates are tried in order, and the first one that produces content **and fits** wins. That is what makes a plan degrade gracefully as the units get smaller — a logo gives way to a name, a name to a unit number:

```ts
content: [
  { type: 'image', href: ({ item }) => item?.logo as string, minHeight: 16 },
  { type: 'text', text: ({ item }) => item?.title as string },
  { type: 'text', text: ({ id }) => id, opacity: 0.5 },
]
```

A candidate is skipped when its callback returns nothing or its `when()` returns `false`, and rejected when what it rendered does not fit. A unit that exhausts the chain is left blank — the full name is still in the popup.

Fit is measured differently per type, on purpose. Text is thin and can lie along the long axis of an L-shaped unit, so it is checked against the free run through the placement point. An image or a card needs a real box, so it is checked against the largest rectangle inscribed in the shape.

In the demo above, `u-105` — the tiny unit — has no data at all, so it falls through to the last candidate in every mode.

## Text

```ts
{
  type: 'text',
  text: ({ item }) => item?.title as string,
  rotate: 'auto',        // -90° in a unit that is tall and narrow
  fill: '#eaeaff',
  fontWeight: 600,
}
```

Return an array to get several lines — there is no automatic wrapping, because whoever knows the brand breaks its name better:

```ts
{ type: 'text', text: ({ item }) => (item?.title as string).split(' '), lineHeight: 1.2 }
```

`rotate: 'auto'` turns the label only when it does not fit horizontally **and** the shape is clearly taller than it is wide. An almost square unit is left alone — otherwise neighbouring labels end up at different angles over a hair of difference.

## Images

```ts
{
  type: 'image',
  href: ({ item }) => item?.logo as string,
  ratio: ({ item }) => item?.ratio as number,
  minHeight: 16,
}
```

The image goes into the largest rectangle of **its own** aspect ratio that fits the shape — a wide logo gets a wide box, a tall one a tall box.

Pass `ratio` when your data knows it. Without it the plugin loads the file to measure it, draws into the whole slot in the meantime, and redraws once the real proportions are in; ratios are cached per URL, so one brand across three floors is fetched once.

`minHeight` is what makes the logo-to-name fallback work: an image that would come out a couple of units tall is not a logo any more, and the unit is better off with its name.

## Custom content

Anything the application draws itself. The plugin does not interpret the result — it measures it, scales it into the slot and clips it to the shape:

```ts
{
  type: 'custom',
  minScale: 0.45,
  render: ({ item, rect, fontSize }) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    // ...build the card inside rect...
    return group
  },
}
```

The `card` mode in the demo is exactly this: a plate with a name and a unit number, shrunk where the unit is too small for it at full size, and handed to the next candidate where shrinking would take it below `minScale`.

## Options

| Option         | Type                 | Default | Description                                              |
|----------------|----------------------|---------|----------------------------------------------------------|
| `sourceLayer`  | `string`             | —       | Layer id whose direct children get content. Required      |
| `content`      | `ContentCandidate[]` | —       | Candidates in priority order. Required                    |
| `grid`         | `number`             | `24`    | Sampling density: cells along the longer side of the bbox |
| `padding`      | `number`             | `0.08`  | Inset from the walls, as a fraction of each side          |
| `fontScale`    | `number`             | `70`    | Divider of the viewBox height that yields the font size   |
| `clip`         | `boolean`            | `true`  | Clip content to the shape of its element                  |
| `idAttribute`  | `string`             | `'id'`  | SVG attribute holding the element id                      |
| `className`    | `string`             | —       | Extra class on the generated layer                        |

The font size is derived from the schema rather than given as a number: a size that reads on a 1600x800 viewBox disappears on 17000x7000, while a divider carries over between plans unchanged.

## Things worth knowing

- **The shapes in this demo are deliberately hostile.** A ring whose center is a hole, a narrow column that only takes a rotated label, a group wrapper instead of a flat shape, and a unit written as `transform="scale(-1)"` — the way editors record a half turn. All of them are placed from real geometry, so none of them needs a hand-placed label.
- **Turn `clip` off** in the demo to see what the clipping is for: content that overflows a shape is cut at its outline rather than spilling onto the neighbours.
- **Placement is computed once per data change**, in schema units, and scales with the schema. There is no level-of-detail switching on zoom yet.
- **Labels of neighbouring shapes are placed independently** — on a very dense plan they can visually crowd each other.

Full reference: [ContentPlugin in the library docs](https://github.com/cossackgh/client-svg-schemas/blob/main/docs/api.md#contentplugin).
