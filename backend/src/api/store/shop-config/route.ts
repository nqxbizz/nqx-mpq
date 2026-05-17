import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { getShopConfig } from '../../../lib/shop-config'
import { getShopSettings } from '../../../lib/shop-settings'

// Public: the storefront fetches brand/theme + live showcase state from here.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cfg = getShopConfig()
  const settings = await getShopSettings(req.scope)
  res.json({
    brand: cfg.brand,
    theme: cfg.theme,
    shop: cfg.shop,
    features: {
      ...cfg.features,
      ...settings, // runtime overrides win
    },
  })
}
