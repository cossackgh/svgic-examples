import DefaultTheme from 'vitepress/theme'
import DemoBlock from './components/DemoBlock.vue'
import ReactMount from './components/ReactMount.vue'
// @ts-ignore — Vite handles CSS imports, TS doesn't need to
import './style.css'
import type { Theme } from 'vitepress'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DemoBlock', DemoBlock)
    app.component('ReactMount', ReactMount)
  },
} satisfies Theme
