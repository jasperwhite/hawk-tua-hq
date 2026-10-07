"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

/** A responsive grid for bento cards. Size cards with `col-span-*` / `row-span-*`. */
function GlassBentoGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-bento-grid"
      className={cn("grid w-full auto-rows-[20rem] grid-cols-1 gap-3 md:grid-cols-3", className)}
      {...props}
    />
  )
}

/**
 * A feature tile on glass. The `background` fills the top of the card; on
 * hover the text lifts, a call to action slides in and a light follows the
 * pointer across the glass.
 */
function GlassBentoCard({
  name,
  description,
  icon,
  background,
  href,
  cta = "Learn more",
  className,
  onPointerMove,
  ...props
}: Omit<React.ComponentProps<typeof LiquidGlass>, "children"> & {
  name: React.ReactNode
  description?: React.ReactNode
  /** An icon element, e.g. <HugeiconsIcon icon={…} />. */
  icon?: React.ReactNode
  /** Visual behind the content: an image, an illustration, a live demo. */
  background?: React.ReactNode
  /** Makes the whole card a link. */
  href?: string
  cta?: React.ReactNode
}) {
  const body = (
    <>
      {background ? (
        <div
          aria-hidden
          className="absolute inset-0 -z-[5] overflow-hidden rounded-[inherit] [mask-image:linear-gradient(to_bottom,black_45%,transparent_85%)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.2,0.64,1)] group-hover/bento:scale-[1.04]"
        >
          {background}
        </div>
      ) : null}
      {/* A light that follows the pointer. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-[4] rounded-[inherit] bg-[radial-gradient(420px_circle_at_var(--x,50%)_var(--y,50%),oklch(1_0_0/0.22),transparent_45%)] opacity-0 transition-opacity duration-300 group-hover/bento:opacity-100"
      />
      <div className="mt-auto flex flex-col gap-1.5 p-5 transition-transform duration-400 ease-[cubic-bezier(0.34,1.3,0.64,1)] group-hover/bento:-translate-y-9 group-focus-visible/bento:-translate-y-9">
        {icon ? (
          <span className="mb-1 grid size-10 place-items-center rounded-[14px] bg-(--glass-highlight) ring-1 ring-white/25 transition-transform duration-400 ease-[cubic-bezier(0.34,1.3,0.64,1)] group-hover/bento:scale-90 [&_svg]:size-5">
            {icon}
          </span>
        ) : null}
        <h3 className="text-[18px] font-semibold tracking-[-0.02em]">{name}</h3>
        {description ? <p className="max-w-md text-[14px] leading-relaxed opacity-70">{description}</p> : null}
      </div>
      {href ? (
        <span className="absolute bottom-0 left-0 flex translate-y-3 items-center gap-1 p-5 text-[13.5px] font-semibold opacity-0 transition-[opacity,transform] duration-400 ease-[cubic-bezier(0.34,1.3,0.64,1)] group-hover/bento:translate-y-0 group-hover/bento:opacity-100 group-focus-visible/bento:translate-y-0 group-focus-visible/bento:opacity-100 [&_svg]:size-4">
          {cta}
          <HugeiconsIcon icon={ArrowRight01Icon} />
        </span>
      ) : null}
    </>
  )

  const shared = {
    "data-slot": "glass-bento-card",
    variant: "frosted" as const,
    className: cn(
      "group/bento relative flex flex-col overflow-hidden rounded-[28px] text-(--glass-foreground) outline-none transition-transform duration-400 ease-[cubic-bezier(0.34,1.3,0.64,1)] hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-ring/40",
      className
    ),
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect()
      e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`)
      e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`)
      onPointerMove?.(e)
    },
    ...props,
  }

  return href ? (
    <LiquidGlass asChild {...shared}>
      <a href={href}>{body}</a>
    </LiquidGlass>
  ) : (
    <LiquidGlass {...shared}>{body}</LiquidGlass>
  )
}

export { GlassBentoCard, GlassBentoGrid }
