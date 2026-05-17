import { notFound } from "next/navigation"
import { Suspense } from "react"

import InteractiveLink from "@modules/common/components/interactive-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  return (
    <>
      {/* Editorial category banner (brand SVG, scales crisp on any screen) */}
      <section className="relative h-56 w-full overflow-hidden bg-neutral-950 small:h-72">
        <img
          src="/brand/category-banner.svg"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
          {parents?.length > 0 && (
            <nav className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-white/70">
              {parents.map((parent) => (
                <LocalizedClientLink
                  key={parent.id}
                  href={`/categories/${parent.handle}`}
                  className="transition-colors hover:text-[var(--brand-accent)]"
                >
                  {parent.name}
                </LocalizedClientLink>
              ))}
            </nav>
          )}
          <h1
            className="text-4xl small:text-5xl"
            data-testid="category-page-title"
          >
            {category.name}
          </h1>
        </div>
      </section>

      <div
        className="content-container flex flex-col py-8 small:flex-row small:items-start"
        data-testid="category-container"
      >
      <RefinementList sortBy={sort} data-testid="sort-by-container" />
      <div className="w-full">
        {category.description && (
          <div className="mb-8 text-base-regular">
            <p>{category.description}</p>
          </div>
        )}
        {category.category_children && (
          <div className="mb-8 text-base-large">
            <ul className="grid grid-cols-1 gap-2">
              {category.category_children?.map((c) => (
                <li key={c.id}>
                  <InteractiveLink href={`/categories/${c.handle}`}>
                    {c.name}
                  </InteractiveLink>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Suspense
          fallback={
            <SkeletonProductGrid
              numberOfProducts={category.products?.length ?? 8}
            />
          }
        >
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            categoryId={category.id}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
      </div>
    </>
  )
}
