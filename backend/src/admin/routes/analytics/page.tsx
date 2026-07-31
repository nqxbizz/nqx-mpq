import { defineRouteConfig } from '@medusajs/admin-sdk'
import { ChartBar } from '@medusajs/icons'
import { Container, Heading, Text, Table, Badge, Button } from '@medusajs/ui'
import { useEffect, useState } from 'react'

type Cat = {
  name: string
  products: number
  units: number
  catalogValue: number
  inventoryValue: number
  avgPrice: number
  minPrice: number
  maxPrice: number
  pctOfInventoryValue: number
}
type Data = {
  currency: string
  currencySymbol: string
  generatedAt: string
  totals: { products: number; units: number; catalogValue: number; inventoryValue: number }
  categories: Cat[]
}

const AnalyticsPage = () => {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/admin/analytics', { credentials: 'include' })
      .then((r) => r.json())
      .then(setD)
      .catch(() => setD(null))
      .finally(() => setLoading(false))
  }
  useEffect(() => {
    load()
  }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: d?.currency || 'EUR',
      maximumFractionDigits: 0,
    }).format(n || 0)
  const num = (n: number) => new Intl.NumberFormat().format(Math.round(n || 0))

  return (
    <Container className="p-0 divide-y">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Catalog Analytics</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Product counts and value by category
          </Text>
        </div>
        <Button variant="secondary" size="small" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ui-border-base">
            <Kpi label="Products" value={num(d.totals.products)} />
            <Kpi label="Units in stock" value={num(d.totals.units)} sub="from quantity" />
            <Kpi label="Catalog value" value={fmt(d.totals.catalogValue)} sub="sum of list prices" />
            <Kpi label="Inventory value" value={fmt(d.totals.inventoryValue)} sub="price × quantity" />
          </div>

          <div className="px-6 py-4">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Category</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Products</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Units</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Catalog value</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Inventory value</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">% of inv.</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Avg price</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Price range</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {d.categories.map((c) => (
                  <Table.Row key={c.name}>
                    <Table.Cell>
                      <Badge size="2xsmall">{c.name}</Badge>
                    </Table.Cell>
                    <Table.Cell className="text-right">{num(c.products)}</Table.Cell>
                    <Table.Cell className="text-right">{num(c.units)}</Table.Cell>
                    <Table.Cell className="text-right">{fmt(c.catalogValue)}</Table.Cell>
                    <Table.Cell className="text-right font-medium">{fmt(c.inventoryValue)}</Table.Cell>
                    <Table.Cell className="text-right">{c.pctOfInventoryValue.toFixed(1)}%</Table.Cell>
                    <Table.Cell className="text-right">{fmt(c.avgPrice)}</Table.Cell>
                    <Table.Cell className="text-right text-ui-fg-subtle">
                      {fmt(c.minPrice)}–{fmt(c.maxPrice)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            <Text size="xsmall" className="text-ui-fg-muted mt-3">
              Generated {new Date(d.generatedAt).toLocaleString()}. Inventory value reads
              product quantity — if it shows 0, run <code>backfill:quantity</code>.
            </Text>
          </div>
        </>
      )}

      {!d && !loading && (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Could not load analytics.</Text>
        </div>
      )}
    </Container>
  )
}

const Kpi = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="bg-ui-bg-base px-6 py-5">
    <Text size="small" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Heading level="h2" className="mt-1">
      {value}
    </Heading>
    {sub && (
      <Text size="xsmall" className="text-ui-fg-muted">
        {sub}
      </Text>
    )}
  </div>
)

export const config = defineRouteConfig({
  label: 'Catalog Analytics',
  icon: ChartBar,
})

export default AnalyticsPage
