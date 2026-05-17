import fs from 'fs'
import path from 'path'

/**
 * Loads the project-wide shop.config.json (the single re-branding file).
 * In Docker it is copied to /shop.config.json; in local dev it sits one
 * level above /backend. Override with SHOP_CONFIG_PATH.
 */
let cached: any = null

export function getShopConfig(): any {
  if (cached) return cached
  const candidates = [
    process.env.SHOP_CONFIG_PATH,
    '/shop.config.json',
    path.resolve(process.cwd(), '../shop.config.json'),
    path.resolve(process.cwd(), 'shop.config.json'),
  ].filter(Boolean) as string[]

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cached = JSON.parse(fs.readFileSync(p, 'utf-8'))
        return cached
      }
    } catch {
      /* keep trying */
    }
  }
  // Safe fallback so the app never crashes on a missing config.
  cached = {
    brand: { name: 'Shop', currency: 'EUR' },
    theme: { colors: {} },
    features: { showcaseMode: true },
    shop: {},
  }
  return cached
}
