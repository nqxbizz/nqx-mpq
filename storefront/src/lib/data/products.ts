"use server"

import { sdk } from "@lib/config"
import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductListParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,+metadata,+tags,",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

const DEFAULT_LIMIT = 12

/**
 * "Latest arrivals" order. The Store API only accepts a *single* order field,
 * and `created_at` is not unique in this catalogue (the import created
 * thousands of products within the same millisecond), so ordering by it makes
 * OFFSET paging unstable — the same product can show up on two pages while
 * another is skipped. Product ids are ULIDs, i.e. unique *and* generated in
 * creation order, so `-id` is both "newest first" and a stable sort key.
 */
const NEWEST_FIRST = "-id"

/** Products per request while collecting prices for a price sort. Keeps each
 * response under Next.js' 2 MB data-cache entry limit so it stays cached. */
const PRICE_SORT_CHUNK = 1000

/** Upper bound on how many products a price sort will rank. */
const PRICE_SORT_MAX = 6000

type SortableProduct = Pick<HttpTypes.StoreProduct, "id" | "variants">

/**
 * Fetch one page of products, sorted.
 *
 * For every sort the API can do itself we paginate server-side, so the whole
 * catalogue is reachable. Price sorting has no API equivalent (calculated
 * prices are resolved after the query), so we rank the full result set here
 * using a cheap id+price projection and then fetch only the page we need.
 */
export const listProductsWithSort = async ({
  page = 1,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: HttpTypes.FindParams & HttpTypes.StoreProductParams
}> => {
  const limit = queryParams?.limit || DEFAULT_LIMIT
  const pageParam = Math.max(page, 1)

  if (sortBy !== "price_asc" && sortBy !== "price_desc") {
    const {
      response: { products, count },
    } = await listProducts({
      pageParam,
      queryParams: {
        ...queryParams,
        limit,
        order: NEWEST_FIRST,
      },
      countryCode,
    })

    return {
      response: { products, count },
      nextPage: pageParam * limit < count ? pageParam + 1 : null,
      queryParams,
    }
  }

  // --- price sort ---------------------------------------------------------
  // Step 1: rank the whole result set on id + calculated price only (~1 MB for
  // 6 000 products, vs ~25 MB for the full payload).
  const fetchPriceChunk = async (chunkPage: number) =>
    listProducts({
      pageParam: chunkPage,
      queryParams: {
        ...queryParams,
        limit: PRICE_SORT_CHUNK,
        order: NEWEST_FIRST,
        fields: "id,*variants.calculated_price",
      },
      countryCode,
    })

  const first = await fetchPriceChunk(1)
  const count = first.response.count
  const rankable = Math.min(count, PRICE_SORT_MAX)

  const ranked: SortableProduct[] = [...first.response.products]

  if (rankable > PRICE_SORT_CHUNK) {
    const rest = await Promise.all(
      Array.from(
        { length: Math.ceil(rankable / PRICE_SORT_CHUNK) - 1 },
        (_, i) => fetchPriceChunk(i + 2)
      )
    )
    rest.forEach(({ response }) => ranked.push(...response.products))
  }

  const sorted = sortProducts(ranked as HttpTypes.StoreProduct[], sortBy)

  // Never advertise more pages than we actually ranked.
  const total = Math.min(count, ranked.length)
  const offset = (pageParam - 1) * limit
  const pageIds = sorted.slice(offset, offset + limit).map((p) => p.id)

  if (!pageIds.length) {
    return {
      response: { products: [], count: total },
      nextPage: null,
      queryParams,
    }
  }

  // Step 2: fetch the full payload for this page only, then restore the
  // price order (the API returns ids in its own order).
  const {
    response: { products },
  } = await listProducts({
    pageParam: 1,
    queryParams: {
      ...queryParams,
      id: pageIds,
      limit: pageIds.length,
    },
    countryCode,
  })

  const byId = new Map(products.map((p) => [p.id, p]))
  const pageProducts = pageIds
    .map((id) => byId.get(id))
    .filter((p): p is HttpTypes.StoreProduct => Boolean(p))

  return {
    response: { products: pageProducts, count: total },
    nextPage: offset + limit < total ? pageParam + 1 : null,
    queryParams,
  }
}
