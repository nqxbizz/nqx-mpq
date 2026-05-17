import fs from "fs"
import { getPublishableKey } from "./publishable-key"

/**
 * Brand/theme come from the project-wide shop.config.json (the single
 * re-branding file). Showcase flags can also be toggled at runtime from the
 * admin, so we read the live values from the backend and fall back to the
 * file.
 */
export type ShopConfig = {
  brand: any
  theme: any
  shop: any
  features: {
    showcaseMode?: boolean
    showcaseHidePrice?: boolean
    showcaseHideCart?: boolean
    [k: string]: any
  }
}

let fileCache: ShopConfig | null = null

export function getShopFile(): ShopConfig {
  if (fileCache) return fileCache
  for (const p of [
    process.env.SHOP_CONFIG_PATH,
    "/shop.config.json",
    "../shop.config.json",
  ]) {
    try {
      if (p && fs.existsSync(p)) {
        fileCache = JSON.parse(fs.readFileSync(p, "utf-8"))
        return fileCache as ShopConfig
      }
    } catch {
      /* keep trying */
    }
  }
  fileCache = {
    brand: { name: "Shop", currencySymbol: "€" },
    theme: { colors: {} },
    shop: {},
    features: { showcaseMode: true },
  }
  return fileCache
}

export async function getShopConfig(): Promise<ShopConfig> {
  const file = getShopFile()
  const base =
    process.env.MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
    "http://localhost:9000"
  try {
    // Top-level route → no publishable key needed (server-side use).
    const r = await fetch(`${base}/shop-config`, {
      next: { revalidate: 20 },
    })
    if (r.ok) {
      const live = await r.json()
      return {
        brand: { ...file.brand, ...live.brand },
        theme: { ...file.theme, ...live.theme },
        shop: { ...file.shop, ...live.shop },
        features: { ...file.features, ...live.features },
      }
    }
  } catch {
    /* backend not up yet — use file defaults */
  }
  return file
}
