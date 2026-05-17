import { listProducts } from "@lib/data/products"
import { listCategories } from "@lib/data/categories"
import { getShopFile } from "@lib/shop"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"
import Reveal from "@modules/common/components/motion/reveal"

// Editorial homepage section — categories strip + a curated product grid.
// Works whether or not Medusa "collections" exist (we use categories).
export default async function CollectionSection({
  countryCode,
  region,
}: {
  countryCode: string
  region: HttpTypes.StoreRegion
}) {
  const home = (getShopFile() as any).home || {}

  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: {
      limit: 12,
      fields: "*variants.calculated_price",
    } as any,
  })

  const categories = (await listCategories().catch(() => [])) as any[]
  const topCategories = (categories || [])
    .filter((c) => !c.parent_category)
    .slice(0, 8)

  return (
    <section
      id="collection"
      className="mx-auto w-full max-w-[1500px] scroll-mt-24 px-5 py-20 small:px-10 small:py-28"
    >
      <Reveal as="header" className="mb-14 text-center">
        <h2 className="text-3xl small:text-4xl">
          {home.featuredHeading || "The Collection"}
        </h2>
        {home.featuredSubcopy && (
          <p
            className="mx-auto mt-4 max-w-md text-sm font-light tracking-wide text-neutral-500"
            style={{ fontFamily: "var(--brand-font)" }}
          >
            {home.featuredSubcopy}
          </p>
        )}
        <div className="mx-auto mt-8 h-px w-16 bg-[var(--brand-accent)]" />
      </Reveal>

      {topCategories.length > 0 && (
        <nav className="mb-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {topCategories.map((c) => (
            <LocalizedClientLink
              key={c.id}
              href={`/categories/${c.handle}`}
              className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 underline-offset-8 transition-colors hover:text-[var(--brand-accent)] hover:underline"
              style={{ fontFamily: "var(--brand-font)" }}
            >
              {c.name}
            </LocalizedClientLink>
          ))}
        </nav>
      )}

      <ul className="grid grid-cols-2 gap-x-5 gap-y-14 small:grid-cols-3 small:gap-x-8 small:gap-y-20 large:grid-cols-4">
        {products?.map((product, i) => (
          <Reveal as="li" index={i} key={product.id}>
            <ProductPreview product={product} region={region} />
          </Reveal>
        ))}
      </ul>

      <div className="mt-20 text-center">
        <LocalizedClientLink
          href="/store"
          className="inline-block border border-[var(--brand-fg)] px-10 py-3.5 text-[12px] uppercase tracking-[0.28em] transition-colors duration-300 hover:bg-[var(--brand-fg)] hover:text-[var(--brand-on-primary)]"
          style={{ fontFamily: "var(--brand-font)" }}
        >
          View Full Catalogue
        </LocalizedClientLink>
      </div>
    </section>
  )
}
