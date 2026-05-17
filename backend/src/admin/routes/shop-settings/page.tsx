import { defineRouteConfig } from '@medusajs/admin-sdk'
import { CogSixTooth } from '@medusajs/icons'
import {
  Container,
  Heading,
  Switch,
  Text,
  Button,
  toast,
} from '@medusajs/ui'
import { useEffect, useState } from 'react'

type Settings = {
  showcaseMode: boolean
  showcaseHidePrice: boolean
  showcaseHideCart: boolean
}

const ShopSettingsPage = () => {
  const [s, setS] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () =>
    fetch('/admin/shop-settings', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setS(d.settings))

  useEffect(() => {
    load()
  }, [])

  const save = async (patch: Partial<Settings>) => {
    setSaving(true)
    try {
      const r = await fetch('/admin/shop-settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const d = await r.json()
      setS(d.settings)
      toast.success('Shop settings saved')
    } catch {
      toast.error('Could not save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">Shop Settings</Heading>
        <Button variant="secondary" size="small" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="px-6 py-4">
        <Text className="text-ui-fg-subtle mb-6">
          Showcase mode turns the site into a public catalogue of your stock —
          visitors can browse everything, but buying is disabled. Turn it off to
          run as a full webshop with cart &amp; checkout.
        </Text>

        {!s ? (
          <Text>Loading…</Text>
        ) : (
          <div className="flex flex-col gap-y-6 max-w-xl">
            <Row
              title="Showcase mode (catalogue only)"
              desc="Master switch. When ON, the shop is browse-only."
              checked={s.showcaseMode}
              disabled={saving}
              onChange={(v) => save({ showcaseMode: v })}
            />
            <Row
              title="Hide prices"
              desc="Hide all price labels while in showcase mode."
              checked={s.showcaseHidePrice}
              disabled={saving || !s.showcaseMode}
              onChange={(v) => save({ showcaseHidePrice: v })}
            />
            <Row
              title="Hide cart & checkout"
              desc="Hide add-to-cart, cart and checkout while in showcase mode."
              checked={s.showcaseHideCart}
              disabled={saving || !s.showcaseMode}
              onChange={(v) => save({ showcaseHideCart: v })}
            />
          </div>
        )}
      </div>
    </Container>
  )
}

const Row = ({
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  title: string
  desc: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) => (
  <div className="flex items-start justify-between gap-x-4">
    <div>
      <Text weight="plus">{title}</Text>
      <Text size="small" className="text-ui-fg-subtle">
        {desc}
      </Text>
    </div>
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
    />
  </div>
)

export const config = defineRouteConfig({
  label: 'Shop Settings',
  icon: CogSixTooth,
})

export default ShopSettingsPage
