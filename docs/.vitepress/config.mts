import { defineConfig } from 'vitepress'
import react from '@vitejs/plugin-react'

export default defineConfig({
  vite: {
    plugins: [react()],
  },
  title: 'Svgic Examples',
  description: 'Interactive examples for @svgic/core — interactive SVG client',
  base: '/',

  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Examples', link: '/examples/basic' },
      { text: 'Library →', link: 'https://github.com/cossackgh/client-svg-schemas' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
        ],
      },
      {
        text: 'Examples',
        items: [
          { text: 'Basic', link: '/examples/basic' },
          { text: 'Events', link: '/examples/events' },
          { text: 'Styling & Highlight', link: '/examples/styling' },
          { text: 'ID Matching', link: '/examples/id-matching' },
          {
            text: 'Popup',
            items: [
              { text: 'Cursor', link: '/examples/popup/cursor' },
              { text: 'Element', link: '/examples/popup/element' },
              { text: 'Target', link: '/examples/popup/target' },
              { text: 'Template + bind', link: '/examples/popup/template' },
            ],
          },
          { text: 'ZoomPlugin', link: '/examples/zoom' },
          { text: 'DebugPlugin', link: '/examples/debug' },
          { text: 'Custom Plugin', link: '/examples/custom-plugin' },
        ],
      },
      {
        text: 'Frameworks',
        items: [
          { text: 'Vue 3', link: '/frameworks/vue' },
          { text: 'React', link: '/frameworks/react' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/cossackgh/svgic-examples' },
    ],

    search: {
      provider: 'local',
    },
  },
})
