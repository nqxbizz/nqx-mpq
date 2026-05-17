"use client"

import { motion, useReducedMotion, Variants } from "framer-motion"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
}

export default function HeroContent({
  kicker,
  headline,
  subcopy,
  cta,
}: {
  kicker?: string
  headline: string
  subcopy?: string
  cta: string
}) {
  const reduce = useReducedMotion()

  const Wrap: any = reduce ? "div" : motion.div
  const Line: any = reduce ? "div" : motion.div
  const wrapProps = reduce
    ? {}
    : { variants: container, initial: "hidden", animate: "show" }
  const lineProps = reduce ? {} : { variants: item }

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center text-white">
      <Wrap {...wrapProps} className="flex flex-col items-center">
        {kicker && (
          <Line
            {...lineProps}
            className="mb-6 text-[11px] font-medium uppercase tracking-[0.45em] text-white/80"
            style={{ fontFamily: "var(--brand-font)" }}
          >
            {kicker}
          </Line>
        )}
        <Line
          {...lineProps}
          className="text-5xl font-normal leading-[1.05] drop-shadow-sm small:text-7xl large:text-8xl"
          style={{ letterSpacing: "0.06em" }}
        >
          {headline}
        </Line>
        {subcopy && (
          <Line
            {...lineProps}
            className="mt-6 max-w-xl text-sm font-light tracking-wide text-white/85 small:text-base"
            style={{ fontFamily: "var(--brand-font)" }}
          >
            {subcopy}
          </Line>
        )}
        <Line {...lineProps}>
          <a
            href="#collection"
            className="group mt-12 inline-flex items-center gap-3 border border-white/60 px-9 py-3.5 text-[12px] uppercase tracking-[0.28em] text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-neutral-900"
            style={{ fontFamily: "var(--brand-font)" }}
          >
            {cta}
          </a>
        </Line>
      </Wrap>
    </div>
  )
}
