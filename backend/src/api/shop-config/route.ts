import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { getShopConfig } from '../../lib/shop-config'
import { getShopSettings } from '../../lib/shop-settings'

// Public, top-level (NOT under /store, so no publishable-key requirement).
// Used server-side by the storefront layout + middleware to read brand/theme
// and the live showcase state.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cfg = getShopConfig()
  const settings = await getShopSettings(req.scope)
  res.json({
    brand: cfg.brand,
    theme: cfg.theme,
    shop: cfg.shop,
    features: {
      ...cfg.features,
      ...settings,
    },
  })
}
