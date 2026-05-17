import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Image from "next/image"
import { toMedia } from "@lib/util/media"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const img = toMedia(product.thumbnail || product.images?.[0]?.url)

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block"
    >
      <div
        data-testid="product-wrapper"
        className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--brand-muted)]"
        style={{ borderRadius: "var(--brand-radius)" }}
      >
        {img ? (
          <Image
            src={img}
            alt={product.title}
            fill
            quality={70}
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-center transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs uppercase tracking-widest text-neutral-400">
            {product.title}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/[0.04]" />
      </div>

      <div className="mt-4 flex flex-col items-center px-1 text-center">
        <h3
          className="line-clamp-2 text-[13px] font-normal uppercase leading-snug tracking-[0.12em] text-[var(--brand-fg)]"
          style={{ fontFamily: "var(--brand-font-heading)" }}
          data-testid="product-title"
        >
          {product.title}
        </h3>
        {cheapestPrice && (
          <div
            className="mt-2 text-[13px] tracking-wide text-[var(--brand-accent)]"
            style={{ fontFamily: "var(--brand-font)" }}
          >
            <PreviewPrice price={cheapestPrice} />
          </div>
        )}
      </div>
    </LocalizedClientLink>
  )
}
