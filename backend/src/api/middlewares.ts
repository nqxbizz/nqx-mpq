import { defineMiddlewares } from '@medusajs/framework/http'
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from '@medusajs/framework/http'
import { Readable } from 'stream'

// Public, same-origin media proxy for product images.
//
// Images live in MinIO and are only reachable inside the Docker network
// (http://minio:9000); the raw localhost:<minio-port> URL works on the dev
// host but NOT from a remote browser — MinIO is intentionally not exposed via
// the Cloudflare tunnel. The Medusa admin renders the stored image URL
// directly, so without a public route every product image shows as a broken
// icon in production.
//
// Implemented as a middleware (not a file route) because Medusa 2.14's file
// router only supports single `[param]` segments — no catch-all — and image
// keys contain slashes (e.g. productimg/foo.jpg). Mirrors the storefront's
// /media rewrite (next.config.js) but on the api domain, so
// `${BACKEND_PUBLIC_URL}/media/<key>` works in the admin and for visitors.
const ENDPOINT = process.env.S3_ENDPOINT || 'http://minio:9000'
const BUCKET = process.env.S3_BUCKET || 'mpq-media'

async function mediaProxy(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()

  // originalUrl is never rewritten by middleware mounting; strip /media/ + query.
  const key = req.originalUrl
    .split('?')[0]
    .replace(/^\/media\//, '')
    .split('/')
    .map((s) => encodeURIComponent(decodeURIComponent(s)))
    .join('/')

  if (!key) {
    res.status(404).end()
    return
  }

  let upstream: Response
  try {
    upstream = await fetch(`${ENDPOINT}/${BUCKET}/${key}`)
  } catch {
    res.status(502).json({ message: 'media upstream unreachable' })
    return
  }

  if (!upstream.ok || !upstream.body) {
    res.status(upstream.status === 404 ? 404 : 502).end()
    return
  }

  const contentType = upstream.headers.get('content-type')
  if (contentType) res.setHeader('Content-Type', contentType)
  const contentLength = upstream.headers.get('content-length')
  if (contentLength) res.setHeader('Content-Length', contentLength)
  // Image keys are timestamped on upload, so the bytes never change.
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

  Readable.fromWeb(upstream.body as any).pipe(res)
}

export default defineMiddlewares({
  routes: [
    {
      matcher: '/media/*',
      middlewares: [mediaProxy],
    },
  ],
})
