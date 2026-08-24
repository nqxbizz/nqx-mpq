import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

interface MinPricedProduct extends HttpTypes.StoreProduct {
  _minPrice?: number
}

/** Cheapest variant price, or undefined when the product has no price at all. */
const minPrice = (product: HttpTypes.StoreProduct): number | undefined => {
  const amounts = (product.variants ?? [])
    .map((variant) => variant?.calculated_price?.calculated_amount)
    .filter((amount): amount is number => typeof amount === "number")

  return amounts.length ? Math.min(...amounts) : undefined
}

/**
 * Helper function to sort products by price until the store API supports sorting by price
 *
 * Products without a price (roughly a third of this catalogue) are always kept
 * last, in both directions — they used to be scored as 0, which parked them at
 * the front of "Price: Low -> High".
 *
 * @param products
 * @param sortBy
 * @returns products sorted by price
 */
export function sortProducts(
  products: HttpTypes.StoreProduct[],
  sortBy: SortOptions
): HttpTypes.StoreProduct[] {
  let sortedProducts = products as MinPricedProduct[]

  if (["price_asc", "price_desc"].includes(sortBy)) {
    // Precompute the minimum price for each product
    sortedProducts.forEach((product) => {
      product._minPrice = minPrice(product)
    })

    // Sort products based on the precomputed minimum prices
    sortedProducts.sort((a, b) => {
      if (a._minPrice === undefined || b._minPrice === undefined) {
        if (a._minPrice === b._minPrice) {
          return 0
        }
        return a._minPrice === undefined ? 1 : -1
      }

      const diff = a._minPrice - b._minPrice
      return sortBy === "price_asc" ? diff : -diff
    })
  }

  if (sortBy === "created_at") {
    sortedProducts.sort((a, b) => {
      return (
        new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
      )
    })
  }

  return sortedProducts
}
