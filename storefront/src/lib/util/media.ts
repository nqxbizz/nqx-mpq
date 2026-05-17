/**
 * Product images are stored with an absolute MinIO URL (e.g.
 * http://localhost:9010/<bucket>/productimg/x.jpg) that is only reachable
 * from the host browser — NOT from inside the storefront container where the
 * Next image optimizer runs. Rewrite any such URL to the same-origin
 * /media/* proxy (see next.config.js rewrites), which works from both the
 * browser and the container (and for remote visitors).
 *
 * Bucket-agnostic: strips scheme://host/<bucket>/ and keeps the object key,
 * so a cloned shop with a different bucket needs no code change.
 */
export function toMedia(url?: string | null): string {
  if (!url) return ""
  // already proxied / relative
  if (url.startsWith("/media/")) return url
  try {
    const u = new URL(url)
    // pathname = /<bucket>/<key...>  -> drop the bucket segment
    const parts = u.pathname.replace(/^\/+/, "").split("/")
    if (parts.length >= 2) {
      return "/media/" + parts.slice(1).join("/")
    }
    return url
  } catch {
    return url
  }
}
