import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

function GlassNotification({
  className,
  icon,
  app,
  time,
  title,
  children,
  ...props
}: Omit<React.ComponentProps<typeof LiquidGlass>, "title"> & {
  icon?: React.ReactNode
  app?: string
  time?: string
  title: React.ReactNode
}) {
  return (
    <LiquidGlass
      role="status"
      data-slot="glass-notification"
      variant="frosted"
      className={cn(
        "flex w-full max-w-sm items-start gap-3 rounded-[26px] p-3.5 text-(--glass-foreground)",
        className
      )}
      {...props}
    >
      {icon ? (
        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[11px] shadow-[0_2px_6px_rgb(0_0_0/0.15)] [&>*]:size-full">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="truncate text-[15px] font-semibold tracking-[-0.015em]">
            {title}
          </div>
          {time ? (
            <div className="shrink-0 text-[13px] opacity-50">{time}</div>
          ) : null}
        </div>
        {app ? (
          <div className="sr-only">{app}</div>
        ) : null}
        <div className="line-clamp-2 text-[15px] leading-snug tracking-[-0.01em] opacity-85">
          {children}
        </div>
      </div>
    </LiquidGlass>
  )
}

/**
 * Stacks notifications with the iOS depth effect and fans them out on hover.
 * Expanded items overflow downwards, so leave room below the stack.
 */
function GlassNotificationStack({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const items = React.Children.toArray(children)
  return (
    <div
      data-slot="glass-notification-stack"
      className={cn("group/stack relative grid w-full max-w-sm", className)}
      {...props}
    >
      {items.map((child, i) => (
        <div
          key={i}
          data-hidden={i > 2 ? "" : undefined}
          className="col-start-1 row-start-1 origin-top [transform:translateY(calc(var(--i)*16px))_scale(calc(1-var(--i)*0.06))] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.25,0.64,1)] group-hover/stack:[transform:translateY(calc(var(--i)*(100%+0.5rem)))] data-[hidden]:opacity-0 group-hover/stack:data-[hidden]:opacity-100"
          style={{ "--i": i, zIndex: items.length - i } as React.CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

export { GlassNotification, GlassNotificationStack }
