"use client"

import { Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

type SearchBoxProps = {
  searchQuery?: string
  setQueryParams: (name: string, value: string) => void
}

const SearchBox = ({ searchQuery, setQueryParams }: SearchBoxProps) => {
  const [value, setValue] = useState(searchQuery || "")

  // Keep the input in sync when the URL changes (e.g. browser back/forward
  // or a search triggered from the header).
  useEffect(() => {
    setValue(searchQuery || "")
  }, [searchQuery])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setQueryParams("q", value.trim())
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-y-3">
      <Text className="txt-compact-small-plus text-ui-fg-muted">Search</Text>
      <div className="flex items-center gap-x-2">
        <input
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          data-testid="store-search-input"
          className="w-full border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-[var(--brand-fg)] outline-none transition-colors focus:border-[var(--brand-accent)]"
          style={{ borderRadius: "var(--brand-radius)" }}
        />
        <button
          type="submit"
          className="shrink-0 border border-[var(--brand-border)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-neutral-600 transition-colors hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)]"
          style={{ borderRadius: "var(--brand-radius)" }}
        >
          Go
        </button>
      </div>
      {searchQuery ? (
        <button
          type="button"
          onClick={() => {
            setValue("")
            setQueryParams("q", "")
          }}
          className="self-start text-[11px] uppercase tracking-[0.18em] text-neutral-400 underline-offset-4 hover:text-[var(--brand-accent)] hover:underline"
        >
          Clear search
        </button>
      ) : null}
    </form>
  )
}

export default SearchBox
