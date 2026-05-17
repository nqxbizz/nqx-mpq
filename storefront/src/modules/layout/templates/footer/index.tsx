import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getShopFile } from "@lib/shop"

export default async function Footer() {
  const cfg = getShopFile()
  const brand = cfg.brand || {}
  const categories = (await listCategories().catch(() => [])) as any[]
  const topCategories = (categories || [])
    .filter((c) => !c.parent_category)
    .slice(0, 8)

  return (
    <footer className="mt-10 border-t border-[var(--brand-border)] bg-[var(--brand-muted)]">
      <div className="mx-auto w-full max-w-[1500px] px-5 small:px-10">
        <div className="grid grid-cols-1 gap-12 py-20 small:grid-cols-3 small:py-28">
          <div className="small:col-span-1">
            <LocalizedClientLink
              href="/"
              className="text-xl uppercase tracking-[0.28em] text-[var(--brand-fg)]"
              style={{ fontFamily: "var(--brand-font-heading)" }}
            >
              {brand.name || "Shop"}
            </LocalizedClientLink>
            {brand.tagline && (
              <p
                className="mt-5 max-w-xs text-sm font-light leading-relaxed text-neutral-500"
                style={{ fontFamily: "var(--brand-font)" }}
              >
                {brand.tagline}
              </p>
            )}
            {brand.email && (
              <a
                href={`mailto:${brand.email}`}
                className="mt-5 inline-block text-sm text-neutral-500 underline-offset-4 transition-colors hover:text-[var(--brand-accent)] hover:underline"
                style={{ fontFamily: "var(--brand-font)" }}
              >
                {brand.email}
              </a>
            )}
          </div>

          {topCategories.length > 0 && (
            <div>
              <h3 className="mb-5 text-[12px] uppercase tracking-[0.24em] text-[var(--brand-fg)]">
                Categories
              </h3>
              <ul
                className="grid grid-cols-2 gap-y-3"
                data-testid="footer-categories"
              >
                {topCategories.map((c) => (
                  <li key={c.id}>
                    <LocalizedClientLink
                      href={`/categories/${c.handle}`}
                      data-testid="category-link"
                      className="text-sm text-neutral-500 transition-colors hover:text-[var(--brand-accent)]"
                      style={{ fontFamily: "var(--brand-font)" }}
                    >
                      {c.name}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="mb-5 text-[12px] uppercase tracking-[0.24em] text-[var(--brand-fg)]">
              Information
            </h3>
            <ul
              className="grid grid-cols-1 gap-y-3 text-sm text-neutral-500"
              style={{ fontFamily: "var(--brand-font)" }}
            >
              <li>
                <LocalizedClientLink
                  href="/store"
                  className="transition-colors hover:text-[var(--brand-accent)]"
                >
                  Shop all
                </LocalizedClientLink>
              </li>
              <li>
                <LocalizedClientLink
                  href="/account"
                  className="transition-colors hover:text-[var(--brand-accent)]"
                >
                  Account
                </LocalizedClientLink>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="flex flex-col gap-2 border-t border-[var(--brand-border)] py-8 text-xs text-neutral-400 small:flex-row small:justify-between"
          style={{ fontFamily: "var(--brand-font)" }}
        >
          <span>
            © {new Date().getFullYear()} {brand.name || "Shop"}. All rights
            reserved.
          </span>
          <span className="uppercase tracking-[0.2em]">
            {brand.tagline || ""}
          </span>
        </div>
      </div>
    </footer>
  )
}
