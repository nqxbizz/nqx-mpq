"use client"

import { ReactNode, useEffect, useState } from "react"

/**
 * Sticky header that smoothly condenses + strengthens its backdrop after the
 * user scrolls. Transform/opacity/height only — no layout thrash.
 */
export default function NavShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="sticky inset-x-0 top-0 z-50 group">
      <header
        className={[
          "relative mx-auto border-b transition-all duration-300 ease-out",
          scrolled
            ? "h-16 border-[var(--brand-border)] bg-white/90 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.35)] backdrop-blur-md"
            : "h-20 border-transparent bg-white/70 backdrop-blur-sm",
        ].join(" ")}
      >
        {children}
      </header>
    </div>
  )
}
