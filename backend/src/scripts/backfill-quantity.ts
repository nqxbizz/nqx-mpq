import { ExecArgs } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import fs from 'fs'
import path from 'path'

/**
 * Backfill product stock quantity from the legacy MongoDB export into
 * product.metadata.quantity — matched by metadata.legacy_id (= JSON _id).
 *
 * SAFE BY DESIGN for running against the LIVE production DB:
 *   - UPDATE-only, matched on legacy_id. It NEVER creates a product, so any
 *     product deleted on live is simply skipped (reported as "not on live").
 *   - Ignores soft-deleted products (deleted_at) — listProducts hides them.
 *   - Writes ONLY metadata.quantity, merged into existing metadata.
 *   - Idempotent: it SETS (not increments); re-running changes nothing.
 *   - Dry-run by default. Set APPLY=1 to actually write.
 *
 *   docker compose exec backend npm run backfill:quantity              # dry-run
 *   docker compose exec -e APPLY=1 backend npm run backfill:quantity   # write
 */

function dataFile(): string {
  for (const p of [
    process.env.PRODUCTS_JSON,
    '/app/migration-data/products.json',
    path.resolve(process.cwd(), '../migration/data/products.json'),
    path.resolve(process.cwd(), 'migration-data/products.json'),
  ]) {
    if (p && fs.existsSync(p)) return p
  }
  throw new Error(
    'products.json not found (expected mounted at /app/migration-data, ' +
      'or set PRODUCTS_JSON=/abs/path/products.json)'
  )
}

export default async function backfillQuantity({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)
  const apply = process.env.APPLY === '1' || process.env.APPLY === 'true'

  // 1. Build legacy_id -> quantity map from the JSON export.
  const source: any[] = JSON.parse(fs.readFileSync(dataFile(), 'utf-8'))
  const qtyById = new Map<string, number>()
  for (const r of source) {
    const q = Number(r?.quantity)
    qtyById.set(String(r?._id), Number.isFinite(q) ? Math.max(0, Math.trunc(q)) : 0)
  }
  const totalUnits = [...qtyById.values()].reduce((a, b) => a + b, 0)
  logger.info(
    `[backfill] source rows=${source.length} uniqueIds=${qtyById.size} totalUnits=${totalUnits}`
  )

  // 2. Page through live (non-deleted) products and compute the changes.
  const updates: { id: string; metadata: Record<string, any> }[] = []
  let scanned = 0
  let unchanged = 0
  let noLegacy = 0
  let noMatch = 0
  const matched = new Set<string>()

  const pageSize = 500
  for (let skip = 0; ; skip += pageSize) {
    const products = await productModule.listProducts(
      {},
      { select: ['id', 'metadata'], take: pageSize, skip }
    )
    if (!products.length) break
    for (const p of products) {
      scanned++
      const md = (p.metadata || {}) as Record<string, any>
      const legacy = md.legacy_id != null ? String(md.legacy_id) : null
      if (!legacy) {
        noLegacy++
        continue
      }
      if (!qtyById.has(legacy)) {
        noMatch++
        continue
      }
      matched.add(legacy)
      const newQty = qtyById.get(legacy)!
      if (Number(md.quantity) === newQty) {
        unchanged++
        continue
      }
      updates.push({ id: p.id, metadata: { ...md, quantity: newQty } })
    }
    if (products.length < pageSize) break
  }

  const missingOnLive = [...qtyById.keys()].filter((id) => !matched.has(id))

  // 3. Report the plan (always — this is the dry-run output too).
  logger.info('──────────── backfill:quantity plan ────────────')
  logger.info(`live products scanned:        ${scanned}`)
  logger.info(`WILL UPDATE:                  ${updates.length}`)
  logger.info(`already correct (skip):       ${unchanged}`)
  logger.info(`no legacy_id on product:      ${noLegacy}`)
  logger.info(`on live but no JSON match:    ${noMatch}`)
  logger.info(`in JSON but not on live:      ${missingOnLive.length}  (deleted on this host — left untouched)`)
  logger.info('────────────────────────────────────────────────')
  if (missingOnLive.length) {
    logger.info(
      `deleted-on-live sample ids: ${missingOnLive.slice(0, 10).join(', ')}${
        missingOnLive.length > 10 ? ' …' : ''
      }`
    )
  }

  if (!apply) {
    logger.info('[backfill] DRY-RUN — nothing written. Re-run with APPLY=1 to apply.')
    return
  }

  // 4. Apply: metadata-only merge. Per-id update (typed overload), run with
  // bounded concurrency so ~thousands of rows finish quickly but don't flood.
  const concurrency = 25
  let written = 0
  for (let i = 0; i < updates.length; i += concurrency) {
    const slice = updates.slice(i, i + concurrency)
    await Promise.all(
      slice.map((u) => productModule.updateProducts(u.id, { metadata: u.metadata }))
    )
    written += slice.length
    if (written % 500 < concurrency || written === updates.length) {
      logger.info(`[backfill] applied ${written}/${updates.length}`)
    }
  }
  logger.info(`[backfill] DONE — updated ${written} products (quantity set).`)
}
