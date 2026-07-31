import { ExecArgs } from '@medusajs/framework/types'
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from '@medusajs/framework/utils'
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
} from '@medusajs/medusa/core-flows'
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import { getShopConfig } from '../lib/shop-config'

/**
 * One-off migration: exported MongoDB catalogue -> Medusa, mirroring every
 * Google Cloud Storage image into MinIO. Resumable: re-running skips images
 * already in MinIO and products whose handle already exists.
 *
 *   docker compose exec backend npm run migrate:catalogue
 */

const CATEGORY_MAP: Record<string, string> = {
  miniature: 'Miniatures',
  perfume: 'Perfumes',
  parfume: 'Perfumes',
  gift: 'Gifts',
  gifts: 'Gifts',
  soap: 'Soap & Powder',
  sample: 'Samples',
  powder: 'Soap & Powder',
  soapandpowder: 'Soap & Powder',
  gold: 'Gold',
  empty: 'Other',
}

const slugify = (s: string) =>
  (s || 'product')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 80)
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product'

// Final guard: collapse any double dashes and strip leading/trailing dashes
// so Medusa's URL-safe handle validation always passes.
const cleanHandle = (h: string) =>
  h.replace(/-+/g, '-').replace(/^-+|-+$/g, '') || 'product'

function dataFile(): string {
  for (const p of [
    '/app/migration-data/products.json',
    path.resolve(process.cwd(), '../migration/data/products.json'),
    path.resolve(process.cwd(), 'migration-data/products.json'),
  ]) {
    if (fs.existsSync(p)) return p
  }
  throw new Error('products.json not found (expected mounted at /app/migration-data)')
}

export default async function importProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  const cfg = getShopConfig()
  const currency = (cfg.shop?.regionCurrency || 'eur').toLowerCase()

  const products: any[] = JSON.parse(fs.readFileSync(dataFile(), 'utf-8'))
  logger.info(`Loaded ${products.length} source products`)

  const [salesChannel] = await salesChannelModule.listSalesChannels({
    name: 'Default Sales Channel',
  })
  const [shippingProfile] = await fulfillmentModule.listShippingProfiles({
    type: 'default',
  })

  // ---- S3 / MinIO client ----
  const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  })
  const bucket = process.env.S3_BUCKET!
  const fileBase = process.env.S3_FILE_URL!.replace(/\/$/, '')

  const mirrorCache: Record<string, string> = (() => {
    try {
      return JSON.parse(fs.readFileSync('/shared/.image-map.json', 'utf-8'))
    } catch {
      return {}
    }
  })()
  let mirrored = 0

  async function mirror(srcUrl: string): Promise<string | null> {
    if (!srcUrl) return null
    if (mirrorCache[srcUrl]) return mirrorCache[srcUrl]
    // keep the original path (e.g. productimg/xyz.jpg) as the object key.
    // NOTE: the old catalogue has image URLs ending in a stray brace
    // (…IMG_123}). new URL().pathname percent-encodes that to %7D, which
    // then becomes a literal "%7D" in the MinIO key and breaks serving
    // (the proxy decodes it back to "}" → 404). Decode and strip the
    // braces so the object key is clean and URL-safe. fetch() below still
    // uses the original srcUrl, so the brace'd GCS object resolves fine.
    let key: string
    try {
      const u = new URL(srcUrl)
      key = decodeURIComponent(u.pathname)
        .replace(/^\/+/, '')
        .replace(/^mpq-mern-bucket\//, '')
        .replace(/[{}]/g, '')
    } catch {
      return null
    }
    const publicUrl = `${fileBase}/${key}`
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      mirrorCache[srcUrl] = publicUrl
      return publicUrl // already in MinIO
    } catch {
      /* not there yet — download + upload */
    }
    try {
      const resp = await fetch(srcUrl)
      if (!resp.ok) return null
      const buf = Buffer.from(await resp.arrayBuffer())
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buf,
          ContentType:
            resp.headers.get('content-type') || 'image/jpeg',
        })
      )
      mirrored++
      mirrorCache[srcUrl] = publicUrl
      if (mirrored % 200 === 0) {
        logger.info(`  …mirrored ${mirrored} images`)
        fs.writeFileSync(
          '/shared/.image-map.json',
          JSON.stringify(mirrorCache)
        )
      }
      return publicUrl
    } catch (e: any) {
      logger.warn(`  image failed ${srcUrl}: ${e.message}`)
      return null
    }
  }

  // ---- Categories ----
  const wantedCats = new Set<string>()
  for (const p of products) {
    const c = CATEGORY_MAP[(p.category || 'empty').toLowerCase()] || 'Other'
    wantedCats.add(c)
  }
  const { data: existingCats } = await query.graph({
    entity: 'product_category',
    fields: ['id', 'name'],
  })
  const catId: Record<string, string> = {}
  for (const c of existingCats || []) catId[c.name] = c.id
  const toCreate = [...wantedCats].filter((c) => !catId[c])
  if (toCreate.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: toCreate.map((name) => ({
          name,
          is_active: true,
        })),
      },
    })
    for (const c of result) catId[c.name] = c.id
  }
  logger.info(`Categories ready: ${Object.keys(catId).join(', ')}`)

  // ---- Skip products already imported ----
  const { data: existing } = await query.graph({
    entity: 'product',
    fields: ['handle'],
    pagination: { take: 100000, skip: 0 },
  })
  const have = new Set((existing || []).map((p: any) => p.handle))

  let created = 0
  let skipped = 0
  const BATCH = 50
  let batch: any[] = []

  const flush = async () => {
    if (!batch.length) return
    try {
      await createProductsWorkflow(container).run({ input: { products: batch } })
      created += batch.length
      logger.info(`  created ${created} products`)
    } catch (e: any) {
      logger.warn(`  batch failed (${e.message}); retrying one-by-one`)
      for (const prod of batch) {
        try {
          await createProductsWorkflow(container).run({
            input: { products: [prod] },
          })
          created++
        } catch (e2: any) {
          logger.warn(`  product "${prod.title}" failed: ${e2.message}`)
        }
      }
    }
    fs.writeFileSync('/shared/.image-map.json', JSON.stringify(mirrorCache))
    batch = []
  }

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const handle = cleanHandle(
      `${slugify(p.titletolow || p.title)}-${String(p._id).slice(-6)}`
    )
    if (have.has(handle)) {
      skipped++
      continue
    }
    have.add(handle)

    const catName =
      CATEGORY_MAP[(p.category || 'empty').toLowerCase()] || 'Other'

    const imgUrls: string[] = []
    const main = await mirror(p.mainImage)
    if (main) imgUrls.push(main)
    for (const im of p.images || []) {
      const m = await mirror(im)
      if (m && !imgUrls.includes(m)) imgUrls.push(m)
    }

    const priceMajor = Number(p.price) || 0

    batch.push({
      title: p.title || 'Untitled',
      handle,
      description: p.description || '',
      status:
        p.show === false ? ProductStatus.DRAFT : ProductStatus.PUBLISHED,
      category_ids: catId[catName] ? [catId[catName]] : [],
      shipping_profile_id: shippingProfile?.id,
      sales_channels: salesChannel ? [{ id: salesChannel.id }] : [],
      images: imgUrls.map((url) => ({ url })),
      thumbnail: imgUrls[0],
      metadata: {
        legacy_id: String(p._id),
        typ: (p.typ || '').toString().toUpperCase().trim(),
        sex: (p.sex || '').toString().toLowerCase().trim(),
        size_ml: p.size ?? null,
        magazine: p.magazine || null,
        featured: !!p.featured,
        legacy_currency: p.currency || 'EUR',
      },
      options: [{ title: 'Default', values: ['Default'] }],
      variants: [
        {
          title: 'Default',
          sku: `MPQ-${String(p._id).slice(-8)}`,
          manage_inventory: false,
          options: { Default: 'Default' },
          prices: [{ currency_code: currency, amount: priceMajor }],
        },
      ],
    })

    if (batch.length >= BATCH) await flush()
  }
  await flush()
  fs.writeFileSync('/shared/.image-map.json', JSON.stringify(mirrorCache))

  logger.info('────────────────────────────────────────────')
  logger.info(
    `Import done. created=${created} skipped(existing)=${skipped} imagesMirrored=${mirrored}`
  )
  logger.info('────────────────────────────────────────────')
}
