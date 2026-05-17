import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import { getShopFile } from "@lib/shop"

export default async function Nav() {
  const brandName = getShopFile().brand?.name || "Shop"
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky inset-x-0 top-0 z-50 group">
      <header className="relative mx-auto h-20 border-b border-[var(--brand-border)] bg-white/85 backdrop-blur-md transition-colors duration-300">
        <nav className="mx-auto flex h-full w-full max-w-[1500px] items-center justify-between px-5 small:px-10">
          <div className="flex h-full flex-1 basis-0 items-center">
            <div className="h-full">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
              />
            </div>
          </div>

          <div className="flex h-full items-center">
            <LocalizedClientLink
              href="/"
              data-testid="nav-store-link"
              className="text-xl small:text-2xl uppercase tracking-[0.28em] text-[var(--brand-fg)] transition-colors hover:text-[var(--brand-accent)]"
              style={{ fontFamily: "var(--brand-font-heading)" }}
            >
              {brandName}
            </LocalizedClientLink>
          </div>

          <div className="flex h-full flex-1 basis-0 items-center justify-end gap-x-6">
            <div className="hidden h-full items-center gap-x-7 small:flex">
              <LocalizedClientLink
                className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 transition-colors hover:text-[var(--brand-accent)]"
                href="/store"
                style={{ fontFamily: "var(--brand-font)" }}
              >
                Shop
              </LocalizedClientLink>
              <LocalizedClientLink
                className="text-[11px] uppercase tracking-[0.22em] text-neutral-500 transition-colors hover:text-[var(--brand-accent)]"
                href="/account"
                data-testid="nav-account-link"
                style={{ fontFamily: "var(--brand-font)" }}
              >
                Account
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="flex gap-2 text-[11px] uppercase tracking-[0.22em] text-neutral-500 hover:text-[var(--brand-accent)]"
                  href="/cart"
                  data-testid="nav-cart-link"
                  style={{ fontFamily: "var(--brand-font)" }}
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
