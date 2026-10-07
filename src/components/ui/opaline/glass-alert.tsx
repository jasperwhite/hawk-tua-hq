import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  AlertCircleIcon,
  Alert02Icon,
  CircleCheckIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type AlertVariant = "default" | "info" | "success" | "warning" | "destructive"

type Icon = React.ComponentProps<typeof HugeiconsIcon>["icon"]

const tones: Record<AlertVariant, { tint?: string; accent: string; icon?: Icon }> = {
  default: { accent: "currentColor", icon: InformationCircleIcon },
  info: { tint: "oklch(0.62 0.19 255 / 0.16)", accent: "oklch(0.6 0.2 255)", icon: InformationCircleIcon },
  success: { tint: "oklch(0.72 0.19 148 / 0.16)", accent: "oklch(0.62 0.17 148)", icon: CircleCheckIcon },
  warning: { tint: "oklch(0.8 0.16 75 / 0.2)", accent: "oklch(0.68 0.16 65)", icon: Alert02Icon },
  destructive: { tint: "oklch(0.64 0.22 27 / 0.16)", accent: "oklch(0.6 0.22 27)", icon: AlertCircleIcon },
}

/**
 * A callout on frosted glass. Variants tint the glass and colour the icon;
 * pass your own icon as the first child to replace the default one.
 */
function GlassAlert({
  className,
  variant = "default",
  icon,
  children,
  role,
  style,
  ...props
}: Omit<React.ComponentProps<typeof LiquidGlass>, "variant"> & {
  variant?: AlertVariant
  /** Leading icon. Defaults to one per variant; pass `null` to hide it. */
  icon?: React.ReactNode
}) {
  const tone = tones[variant]
  const glyph =
    icon === undefined ? (tone.icon ? <HugeiconsIcon icon={tone.icon} /> : null) : icon

  return (
    <LiquidGlass
      data-slot="glass-alert"
      data-variant={variant}
      role={role ?? (variant === "destructive" || variant === "warning" ? "alert" : "status")}
      variant="frosted"
      tint={tone.tint}
      className={cn(
        "grid w-full grid-cols-[auto_1fr_auto] items-start gap-y-0.5 rounded-[22px] px-4 py-3.5 text-[14px] text-(--glass-foreground)",
        className
      )}
      style={{ "--alert-accent": tone.accent, ...style } as React.CSSProperties}
      {...props}
    >
      {glyph ? (
        <span
          data-slot="glass-alert-icon"
          aria-hidden
          className="row-span-2 mt-px mr-3 grid size-5 place-items-center text-(--alert-accent) [&_svg]:size-5"
        >
          {glyph}
        </span>
      ) : null}
      {children}
    </LiquidGlass>
  )
}

function GlassAlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-alert-title"
      className={cn("col-start-2 min-h-5 font-semibold tracking-[-0.01em]", className)}
      {...props}
    />
  )
}

function GlassAlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-alert-description"
      className={cn("col-start-2 text-[13.5px] leading-relaxed opacity-75 [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

/** Optional trailing slot for a button or link, aligned to the title. */
function GlassAlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-alert-action"
      className={cn("col-span-2 col-start-2 mt-2.5 flex flex-wrap gap-2 sm:col-span-1 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:ml-4 sm:self-center", className)}
      {...props}
    />
  )
}

export { GlassAlert, GlassAlertAction, GlassAlertDescription, GlassAlertTitle, type AlertVariant }
