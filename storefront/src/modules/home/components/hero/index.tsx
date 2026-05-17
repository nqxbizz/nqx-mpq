import Image from "next/image"
import { getShopFile } from "@lib/shop"
import HeroContent from "./hero-content"

const Hero = () => {
  const cfg = getShopFile()
  const home = (cfg as any).home || {}
  const brand = cfg.brand || {}

  const desktop = home.heroImageDesktop || "/brand/hero-desktop.jpg"
  const mobile = home.heroImageMobile || home.heroImageDesktop || desktop
  const kicker = home.heroKicker || brand.tagline || ""
  const headline = home.heroHeadline || brand.name || "Welcome"
  const subcopy = home.heroSubcopy || brand.description || ""
  const cta = home.heroCta || "Explore the Collection"

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-neutral-950">
      {/* Original brand cover — kept as the signature material.
          Slow Ken Burns drift adds life without distracting (CSS, so it
          respects prefers-reduced-motion via the global rule). */}
      <picture>
        <source media="(max-width: 768px)" srcSet={mobile} />
        <Image
          src={desktop}
          alt={`${headline} — ${kicker}`}
          fill
          priority
          sizes="100vw"
          className="hero-kenburns object-cover object-center"
        />
      </picture>

      {/* Editorial gradient for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60" />

      <HeroContent
        kicker={kicker}
        headline={headline}
        subcopy={subcopy}
        cta={cta}
      />

      {/* Refined scroll indicator */}
      <a
        href="#collection"
        aria-label="Scroll to collection"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/70 transition-colors hover:text-white"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          className="animate-bounce"
          style={{ animationDuration: "2.4s" }}
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </a>
    </section>
  )
}

export default Hero
