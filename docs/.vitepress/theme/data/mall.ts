import type { SvgicItem } from '@svgic/core'

/**
 * Tenants of the demo mall.
 *
 * Kept apart from the components so every showcase page works from the same
 * directory, the way a real site would read it from an API. Ids match the
 * elements in `public/svgs/mall-l*.svg`, which are produced by
 * `scripts/gen-mall.mjs`.
 */
export interface Tenant extends SvgicItem {
  id: string
  title: string
  level: 1 | 2 | 3
  category: string
  /** Unit number as printed on the plan */
  unit: string
  logo?: string
  /** Width / height of the logo file, so the plugin can size it without loading */
  ratio?: number
  hours?: string
}

const t = (
  id: string,
  title: string,
  level: 1 | 2 | 3,
  category: string,
  extra: Partial<Tenant> = {},
): Tenant => ({
  id,
  title,
  level,
  category,
  unit: id.replace(/^[auk]-/, ''),
  hours: '10:00 — 22:00',
  ...extra,
})

export const LOGOS = {
  aurum: { logo: '/logos/aurum.svg', ratio: 360 / 96 },
  vento: { logo: '/logos/vento.svg', ratio: 320 / 100 },
  grano: { logo: '/logos/grano.svg', ratio: 1 },
  lumen: { logo: '/logos/lumen.svg', ratio: 300 / 110 },
  kiddo: { logo: '/logos/kids.svg', ratio: 260 / 120 },
}

export const TENANTS: Tenant[] = [
  // ---- level 1: anchors, jewellery, beauty, services ----
  t('a-101', 'Nordwest Department', 1, 'Department store'),
  t('a-102', 'Lumen Electronics', 1, 'Electronics', LOGOS.lumen),
  t('a-103', 'Fresh Market', 1, 'Supermarket'),
  t('u-101', 'Aurum', 1, 'Jewellery', LOGOS.aurum),
  t('u-102', 'Sole', 1, 'Shoes'),
  t('u-103', 'Vento', 1, 'Fashion', LOGOS.vento),
  t('u-104', 'Optika', 1, 'Optics'),
  t('u-105', 'Bookmark', 1, 'Books'),
  t('u-106', 'Zoo Point', 1, 'Pets'),
  t('u-107', 'Timeless', 1, 'Watches'),
  t('u-108', 'Pure Beauty', 1, 'Cosmetics'),
  t('u-109', 'Nail Bar', 1, 'Services'),
  t('u-110', 'Grano Coffee', 1, 'Cafe', { ...LOGOS.grano, hours: '08:00 — 22:00' }),
  t('u-111', 'Denim Yard', 1, 'Fashion'),
  t('u-112', 'Loft Home', 1, 'Home'),
  t('u-113', 'Bloom', 1, 'Flowers'),
  t('u-114', 'Pharmacy 24', 1, 'Pharmacy', { hours: 'Open 24 hours' }),
  t('u-115', 'Mobile Point', 1, 'Services'),
  t('k-101', 'Nuts & Dried Fruit', 1, 'Kiosk'),
  t('k-102', 'Flower Stand', 1, 'Kiosk'),
  t('k-103', 'Coffee To Go', 1, 'Kiosk'),
  t('k-104', 'Key Cutting', 1, 'Kiosk'),

  // ---- level 2: fashion ----
  t('a-201', 'Zara Home', 2, 'Home'),
  t('a-202', 'Mediamarkt', 2, 'Electronics'),
  t('u-201', 'Massimo', 2, 'Fashion'),
  t('u-202', 'Uniqlo', 2, 'Fashion'),
  t('u-203', 'Bershka', 2, 'Fashion'),
  t('u-204', 'Cropp', 2, 'Fashion'),
  t('u-205', 'Kiddo', 2, 'Kids', LOGOS.kiddo),
  t('u-206', 'Reserved', 2, 'Fashion'),
  t('u-207', 'House', 2, 'Fashion'),
  t('u-208', 'Mohito', 2, 'Fashion'),
  t('u-209', 'Levis', 2, 'Fashion'),
  t('u-210', 'Guess', 2, 'Fashion'),
  t('u-211', 'Calzedonia', 2, 'Lingerie'),
  t('u-212', 'Oysho', 2, 'Lingerie'),
  t('u-213', 'Parfum', 2, 'Cosmetics'),
  t('u-214', 'Rive Gauche', 2, 'Cosmetics'),
  t('k-201', 'Sunglasses', 2, 'Kiosk'),
  t('k-202', 'Sim Cards', 2, 'Kiosk'),
  t('k-203', 'Watch Repair', 2, 'Kiosk'),

  // ---- level 3: leisure and food ----
  t('a-301', 'Cinema Hall', 3, 'Entertainment', { hours: '10:00 — 01:00' }),
  t('a-302', 'Food Court', 3, 'Food'),
  t('u-301', 'Burger Yard', 3, 'Food'),
  t('u-302', 'Wok Street', 3, 'Food'),
  t('u-303', 'Pizza Nova', 3, 'Food'),
  t('u-304', 'Sweet Point', 3, 'Food'),
  t('u-305', 'Arcade Club', 3, 'Entertainment'),
  t('k-301', 'Ice Cream', 3, 'Kiosk'),
]

export const LEVELS = [1, 2, 3] as const

export const tenantsOf = (level: number): Tenant[] =>
  TENANTS.filter((tenant) => tenant.level === level)

export const planSrc = (level: number): string => `/svgs/mall-l${level}.svg`
