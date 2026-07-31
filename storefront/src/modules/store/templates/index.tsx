import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  page,
  categoryId,
  searchQuery,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  categoryId?: string
  searchQuery?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  const categories = await listCategories().catch(() => [])
  const activeCategory = categories?.find((c) => c.id === categoryId)

  const heading = searchQuery
    ? `Results for “${searchQuery}”`
    : activeCategory
    ? activeCategory.name
    : "All products"

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-6 content-container"
      data-testid="category-container"
    >
      <RefinementList
        sortBy={sort}
        categories={categories || []}
        activeCategoryId={categoryId}
        searchQuery={searchQuery}
      />
      <div className="w-full">
        <div className="mb-8 text-2xl-semi">
          <h1 data-testid="store-page-title">{heading}</h1>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            categoryId={categoryId}
            searchQuery={searchQuery}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
