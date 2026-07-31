"use client"

import { Popover, PopoverButton, PopoverPanel, Transition } from "@headlessui/react"
import { HttpTypes } from "@medusajs/types"
import { Fragment } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

type CategoriesMenuProps = {
  categories: HttpTypes.StoreProductCategory[]
}

const CategoriesMenu = ({ categories }: CategoriesMenuProps) => {
  if (!categories?.length) {
    return null
  }

  const sorted = categories
    .slice()
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))

  return (
    <Popover className="relative h-full">
      {({ close }) => (
        <>
          <PopoverButton
            className="flex h-full items-center text-[11px] uppercase tracking-[0.22em] text-neutral-500 outline-none transition-colors hover:text-[var(--brand-accent)] data-[open]:text-[var(--brand-accent)]"
            style={{ fontFamily: "var(--brand-font)" }}
            data-testid="nav-categories-button"
          >
            Categories
          </PopoverButton>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <PopoverPanel className="absolute left-1/2 z-50 mt-2 w-56 -translate-x-1/2 border border-[var(--brand-border)] bg-white/95 p-4 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.4)] backdrop-blur-md">
              <ul className="flex flex-col gap-y-1">
                <li>
                  <LocalizedClientLink
                    href="/store"
                    onClick={close}
                    className="block px-2 py-1.5 text-[11px] uppercase tracking-[0.18em] text-neutral-600 transition-colors hover:text-[var(--brand-accent)]"
                  >
                    All products
                  </LocalizedClientLink>
                </li>
                {sorted.map((c) => (
                  <li key={c.id}>
                    <LocalizedClientLink
                      href={`/store?category=${c.id}`}
                      onClick={close}
                      className="block px-2 py-1.5 text-[11px] uppercase tracking-[0.18em] text-neutral-600 transition-colors hover:text-[var(--brand-accent)]"
                      data-testid="nav-category-link"
                    >
                      {c.name}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  )
}

export default CategoriesMenu
