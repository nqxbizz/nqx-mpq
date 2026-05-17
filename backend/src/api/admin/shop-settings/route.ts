import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { getShopSettings, setShopSettings } from '../../../lib/shop-settings'

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({ settings: await getShopSettings(req.scope) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as Record<string, any>
  const patch: any = {}
  if (typeof body.showcaseMode === 'boolean')
    patch.showcaseMode = body.showcaseMode
  if (typeof body.showcaseHidePrice === 'boolean')
    patch.showcaseHidePrice = body.showcaseHidePrice
  if (typeof body.showcaseHideCart === 'boolean')
    patch.showcaseHideCart = body.showcaseHideCart

  const settings = await setShopSettings(req.scope, patch)
  res.json({ settings })
}
