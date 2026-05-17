import { ExecArgs } from '@medusajs/framework/types'
import {
  ContainerRegistrationKeys,
  Modules,
} from '@medusajs/framework/utils'
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from '@medusajs/medusa/core-flows'
import fs from 'fs'
import { getShopConfig } from '../lib/shop-config'

// Idempotent store bootstrap. Safe to run on every container start.
export default async function bootstrap({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const storeModule = container.resolve(Modules.STORE)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  const cfg = getShopConfig()
  const currency = (cfg.shop?.regionCurrency || 'eur').toLowerCase()
  const countries = (cfg.shop?.countries || ['nl', 'de', 'fr']).map(
    (c: string) => c.toLowerCase()
  )
  const regionName = cfg.shop?.regionName || 'Europe'

  const [store] = await storeModule.listStores()

  // ---- Sales channel ----
  let [salesChannel] = await salesChannelModule.listSalesChannels({
    name: 'Default Sales Channel',
  })
  if (!salesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: 'Default Sales Channel' }] },
    })
    salesChannel = result[0]
    logger.info('Created default sales channel')
  }

  // ---- Store currency + default sales channel ----
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          { currency_code: currency, is_default: true },
        ],
        default_sales_channel_id: salesChannel.id,
      },
    },
  })

  // ---- Region ----
  const { data: regions } = await query.graph({
    entity: 'region',
    fields: ['id', 'name'],
  })
  let region: any = regions?.find((r: any) => r.name === regionName)
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: regionName,
            currency_code: currency,
            countries,
            payment_providers: ['pp_system_default'],
          },
        ],
      },
    })
    region = result[0]
    logger.info(`Created region "${regionName}"`)

    await createTaxRegionsWorkflow(container).run({
      input: countries.map((country_code: string) => ({
        country_code,
        provider_id: 'tp_system',
      })),
    })
  }

  // ---- Stock location ----
  const { data: locations } = await query.graph({
    entity: 'stock_location',
    fields: ['id', 'name'],
  })
  let stockLocationId = locations?.[0]?.id
  if (!stockLocationId) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: 'Main Warehouse',
            address: { city: '', country_code: countries[0].toUpperCase(), address_1: '' },
          },
        ],
      },
    })
    stockLocationId = result[0].id
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { default_location_id: stockLocationId },
      },
    })
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: 'manual_manual' },
    })
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocationId, add: [salesChannel.id] },
    })
    logger.info('Created stock location')
  }

  // ---- Shipping profile + a flat shipping option ----
  let [shippingProfile] = await fulfillmentModule.listShippingProfiles({
    type: 'default',
  })
  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: 'Default Shipping Profile', type: 'default' }] },
    })
    shippingProfile = result[0]
  }

  const existingFs = await fulfillmentModule.listFulfillmentSets({
    name: 'Default delivery',
  })
  if (!existingFs.length) {
    const fulfillmentSet = await fulfillmentModule.createFulfillmentSets({
      name: 'Default delivery',
      type: 'shipping',
      service_zones: [
        {
          name: regionName,
          geo_zones: countries.map((c: string) => ({
            country_code: c,
            type: 'country',
          })),
        },
      ],
    })
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
    })
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: 'Standard Shipping',
          price_type: 'flat',
          provider_id: 'manual_manual',
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: 'Standard',
            description: 'Ship in 2-3 days.',
            code: 'standard',
          },
          prices: [
            { currency_code: currency, amount: 10 },
            { region_id: region.id, amount: 10 },
          ],
          rules: [
            { attribute: 'enabled_in_store', value: 'true', operator: 'eq' },
            { attribute: 'is_return', value: 'false', operator: 'eq' },
          ],
        },
      ],
    })
    logger.info('Created fulfillment + shipping option')
  }

  // ---- Publishable API key (storefront needs this) ----
  const { data: keys } = await query.graph({
    entity: 'api_key',
    fields: ['id', 'token', 'type'],
    filters: { type: 'publishable' },
  })
  let apiKey: any = keys?.[0]
  if (!apiKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          { title: 'Webshop', type: 'publishable', created_by: '' },
        ],
      },
    })
    apiKey = result[0]
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: apiKey.id, add: [salesChannel.id] },
    })
    logger.info('Created publishable API key')
  }

  // Share the key with the storefront via a mounted volume.
  try {
    fs.mkdirSync('/shared', { recursive: true })
    fs.writeFileSync('/shared/publishable_key.txt', apiKey.token || '')
  } catch {
    /* volume optional in local dev */
  }

  logger.info('────────────────────────────────────────────')
  logger.info(`PUBLISHABLE_KEY=${apiKey.token}`)
  logger.info('────────────────────────────────────────────')
}
