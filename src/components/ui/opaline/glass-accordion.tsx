import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon } from "@hugeicons/core-free-icons"
import { Accordion as AccordionPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type AccordionVariant = "inset" | "separated"

const VariantContext = React.createContext<AccordionVariant>("inset")

/**
 * Collapsible sections on glass. `inset` groups every item on one glass
 * panel; `separated` gives each item its own glass card that grows open.
 */
function GlassAccordion({
  variant = "inset",
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root> & { variant?: AccordionVariant }) {
  const root = (
    <AccordionPrimitive.Root
      data-slot="glass-accordion"
      data-variant={variant}
      className={cn(variant === "separated" ? "flex w-full flex-col gap-2" : "w-full", variant === "separated" && className)}
      {...props}
    >
      {children}
    </AccordionPrimitive.Root>
  )

  return (
    <VariantContext.Provider value={variant}>
      {variant === "inset" ? (
        <LiquidGlass
          variant="frosted"
          className={cn("w-full rounded-[24px] px-1.5 text-(--glass-foreground)", className)}
        >
          {root}
        </LiquidGlass>
      ) : (
        root
      )}
    </VariantContext.Provider>
  )
}

function GlassAccordionItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  const variant = React.useContext(VariantContext)
  if (variant === "separated") {
    return (
      <AccordionPrimitive.Item data-slot="glass-accordion-item" asChild {...props}>
        <LiquidGlass
          variant="frosted"
          className={cn("rounded-[22px] px-1.5 text-(--glass-foreground)", className)}
        >
          {children}
        </LiquidGlass>
      </AccordionPrimitive.Item>
    )
  }
  return (
    <AccordionPrimitive.Item
      data-slot="glass-accordion-item"
      className={cn("border-b border-current/10 last:border-b-0", className)}
      {...props}
    >
      {children}
    </AccordionPrimitive.Item>
  )
}

function GlassAccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="glass-accordion-trigger"
        className={cn(
          "group/trigger flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-[18px] px-3.5 py-3.5 text-left text-[15px] font-semibold tracking-[-0.01em] outline-none transition-colors hover:bg-(--glass-highlight)/60 focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center rounded-full bg-(--glass-highlight) transition-transform duration-400 ease-[cubic-bezier(0.34,1.4,0.64,1)] group-data-[state=open]/trigger:rotate-180 [&_svg]:size-4"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} />
        </span>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function GlassAccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="glass-accordion-content"
      // Height animates on the content, never on the glass itself.
      className="overflow-hidden data-[state=closed]:animate-[opaline-accordion-up_260ms_cubic-bezier(0.32,0.72,0,1)] data-[state=open]:animate-[opaline-accordion-down_380ms_cubic-bezier(0.32,0.72,0,1)]"
      {...props}
    >
      <div className={cn("px-3.5 pb-4 text-[14px] leading-relaxed opacity-75", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export {
  GlassAccordion,
  GlassAccordionContent,
  GlassAccordionItem,
  GlassAccordionTrigger,
  type AccordionVariant,
}
