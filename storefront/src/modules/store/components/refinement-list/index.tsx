"use client"

import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import SortProducts, { SortOptions } from "./sort-products"
import SearchBox from "./search-box"
import CategoryFilter from "./category-filter"

type RefinementListProps = {
  sortBy: SortOptions
  categories?: HttpTypes.StoreProductCategory[]
  activeCategoryId?: string
  searchQuery?: string
  "data-testid"?: string
}

const RefinementList = ({
  sortBy,
  categories = [],
  activeCategoryId,
  searchQuery,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Set (or clear) a query param. Any filter change resets pagination to
  // page 1 so the user doesn't land on an out-of-range page.
  const setQueryParams = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      if (name !== "page") {
        params.delete("page")
      }
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [searchParams, pathname, router]
  )

  return (
    <div className="flex small:flex-col gap-12 py-4 mb-8 small:px-0 pl-6 small:min-w-[250px] small:ml-[1.675rem]">
      <SearchBox
        searchQuery={searchQuery}
        setQueryParams={setQueryParams}
      />
      <CategoryFilter
        categories={categories}
        activeCategoryId={activeCategoryId}
        setQueryParams={setQueryParams}
      />
      <SortProducts
        sortBy={sortBy}
        setQueryParams={setQueryParams}
        data-testid={dataTestId}
      />
    </div>
  )
}

export default RefinementList
