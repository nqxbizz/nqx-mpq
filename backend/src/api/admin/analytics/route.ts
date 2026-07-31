import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { getShopConfig } from '../../../lib/shop-config'

/**
 * Admin-only catalog analytics: product counts and value per category.
 * Lives under /admin/* so it inherits Medusa's admin auth — never exposed to
 * storefront visitors.
 *
 *   catalogValue   = sum of variant list prices (what the catalogue is priced at)
 *   inventoryValue = sum of price x metadata.quantity (worth of stock on hand;
 *                    reads product.metadata.quantity — populated by backfill:quantity)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const cfg = getShopConfig()
  const currency = (cfg.shop?.regionCurrency || 'eur').toLowerCase()

  const { rows } = await knex.raw(
    `
    select
      coalesce(pc.name, 'Uncategorized')                                       as category,
      count(distinct p.id)::int                                                as products,
      coalesce(sum(coalesce((p.metadata->>'quantity')::numeric, 0)), 0)::float as units,
      coalesce(sum(pr.amount), 0)::float                                       as catalog_value,
      coalesce(sum(pr.amount * coalesce((p.metadata->>'quantity')::numeric, 0)), 0)::float as inventory_value,
      coalesce(avg(pr.amount), 0)::float                                       as avg_price,
      coalesce(min(pr.amount), 0)::float                                       as min_price,
      coalesce(max(pr.amount), 0)::float                                       as max_price
    from product p
    left join product_category_product pcp on pcp.product_id = p.id
    left join product_category pc on pc.id = pcp.product_category_id and pc.deleted_at is null
    left join product_variant pv on pv.product_id = p.id and pv.deleted_at is null
    left join product_variant_price_set pvps on pvps.variant_id = pv.id
    left join price pr
      on pr.price_set_id = pvps.price_set_id
     and pr.deleted_at is null
     and pr.currency_code = ?
    where p.deleted_at is null
    group by coalesce(pc.name, 'Uncategorized')
    order by inventory_value desc, catalog_value desc
    `,
    [currency]
  )

  const totals = rows.reduce(
    (a: any, r: any) => ({
      products: a.products + r.products,
      units: a.units + r.units,
      catalogValue: a.catalogValue + r.catalog_value,
      inventoryValue: a.inventoryValue + r.inventory_value,
    }),
    { products: 0, units: 0, catalogValue: 0, inventoryValue: 0 }
  )

  res.json({
    currency: currency.toUpperCase(),
    currencySymbol: cfg.brand?.currencySymbol || '€',
    generatedAt: new Date().toISOString(),
    totals,
    categories: rows.map((r: any) => ({
      name: r.category,
      products: r.products,
      units: r.units,
      catalogValue: r.catalog_value,
      inventoryValue: r.inventory_value,
      avgPrice: r.avg_price,
      minPrice: r.min_price,
      maxPrice: r.max_price,
      pctOfInventoryValue: totals.inventoryValue
        ? (r.inventory_value / totals.inventoryValue) * 100
        : 0,
    })),
  })
}
