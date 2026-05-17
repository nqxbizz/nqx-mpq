import { Modules } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework/types'
import { getShopConfig } from './shop-config'

/**
 * Runtime shop settings are persisted on the default Store's `metadata`
 * (no extra DB table / module migration needed). Defaults come from
 * shop.config.json so a freshly cloned shop behaves correctly before any
 * admin edit.
 */
export type ShopSettings = {
  showcaseMode: boolean
  showcaseHidePrice: boolean
  showcaseHideCart: boolean
}

export async function getShopSettings(
  container: MedusaContainer
): Promise<ShopSettings> {
  const cfg = getShopConfig()
  const f = cfg.features || {}
  const defaults: ShopSettings = {
    showcaseMode: f.showcaseMode !== false,
    showcaseHidePrice: f.showcaseHidePrice !== false,
    showcaseHideCart: f.showcaseHideCart !== false,
  }

  try {
    const storeModule = container.resolve(Modules.STORE)
    const [store] = await storeModule.listStores({}, { take: 1 })
    const md = (store?.metadata || {}) as Record<string, any>
    return {
      showcaseMode:
        md.showcase_mode != null ? !!md.showcase_mode : defaults.showcaseMode,
      showcaseHidePrice:
        md.showcase_hide_price != null
          ? !!md.showcase_hide_price
          : defaults.showcaseHidePrice,
      showcaseHideCart:
        md.showcase_hide_cart != null
          ? !!md.showcase_hide_cart
          : defaults.showcaseHideCart,
    }
  } catch {
    return defaults
  }
}

export async function setShopSettings(
  container: MedusaContainer,
  patch: Partial<ShopSettings>
): Promise<ShopSettings> {
  const storeModule = container.resolve(Modules.STORE)
  const [store] = await storeModule.listStores({}, { take: 1 })
  if (!store) throw new Error('No store found')

  const current = await getShopSettings(container)
  const next = { ...current, ...patch }

  await storeModule.updateStores(store.id, {
    metadata: {
      ...(store.metadata || {}),
      showcase_mode: next.showcaseMode,
      showcase_hide_price: next.showcaseHidePrice,
      showcase_hide_cart: next.showcaseHideCart,
    },
  })
  return next
}
