import Image from "next/image"
import { getShopFile } from "@lib/shop"

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
      {/* Original brand cover — kept as the signature material */}
      <picture>
        <source media="(max-width: 768px)" srcSet={mobile} />
        <Image
          src={desktop}
          alt={`${headline} — ${kicker}`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </picture>

      {/* Editorial gradient for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/60" />

      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white">
        {kicker && (
          <p
            className="mb-6 text-[11px] font-medium uppercase tracking-[0.45em] text-white/80"
            style={{ fontFamily: "var(--brand-font)" }}
          >
            {kicker}
          </p>
        )}
        <h1
          className="text-5xl font-normal leading-[1.05] drop-shadow-sm small:text-7xl large:text-8xl"
          style={{ letterSpacing: "0.06em" }}
        >
          {headline}
        </h1>
        {subcopy && (
          <p
            className="mt-6 max-w-xl text-sm font-light tracking-wide text-white/85 small:text-base"
            style={{ fontFamily: "var(--brand-font)" }}
          >
            {subcopy}
          </p>
        )}

        <a
          href="#collection"
          className="group mt-12 inline-flex items-center gap-3 border border-white/60 px-9 py-3.5 text-[12px] uppercase tracking-[0.28em] text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-neutral-900"
          style={{ fontFamily: "var(--brand-font)" }}
        >
          {cta}
        </a>
      </div>

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
