import { Metadata } from "next"

import CollectionSection from "@modules/home/components/collection-section"
import Hero from "@modules/home/components/hero"
import { getRegion } from "@lib/data/regions"
import { getShopFile } from "@lib/shop"

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = getShopFile()
  return {
    title: brand?.title || brand?.name || "Home",
    description: brand?.description || "",
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  return (
    <>
      <Hero />
      <CollectionSection countryCode={countryCode} region={region} />
    </>
  )
}
