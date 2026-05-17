"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ReactNode } from "react"

/**
 * Scroll-reveal wrapper. Fades + lifts content into view once.
 * Honours prefers-reduced-motion. Timing follows ui-ux-pro-max:
 * ease-out, ~500ms, 50ms stagger per index (capped).
 */
export default function Reveal({
  children,
  index = 0,
  y = 28,
  className,
  as = "div",
}: {
  children: ReactNode
  index?: number
  y?: number
  className?: string
  as?: "div" | "li" | "section" | "header"
}) {
  const reduce = useReducedMotion()
  const MotionTag = (motion as any)[as]

  if (reduce) {
    const Tag = as as any
    return <Tag className={className}>{children}</Tag>
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.55,
        delay: Math.min(index * 0.05, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionTag>
  )
}
