"use client"

import { HttpTypes } from "@medusajs/types"

import FilterRadioGroup from "@modules/common/components/filter-radio-group"

type CategoryFilterProps = {
  categories: HttpTypes.StoreProductCategory[]
  activeCategoryId?: string
  setQueryParams: (name: string, value: string) => void
}

const ALL = "all"

const CategoryFilter = ({
  categories,
  activeCategoryId,
  setQueryParams,
}: CategoryFilterProps) => {
  if (!categories?.length) {
    return null
  }

  const items = [
    { value: ALL, label: "All categories" },
    ...categories
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .map((c) => ({ value: c.id, label: c.name })),
  ]

  const handleChange = (value: string) => {
    setQueryParams("category", value === ALL ? "" : value)
  }

  return (
    <FilterRadioGroup
      title="Category"
      items={items}
      value={activeCategoryId || ALL}
      handleChange={handleChange}
      data-testid="category-filter"
    />
  )
}

export default CategoryFilter
