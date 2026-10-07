import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { PanelLeftIcon } from "@hugeicons/core-free-icons"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { useActiveIndicator } from "@/hooks/use-active-indicator"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type SidebarContextValue = {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
})

const useGlassSidebar = () => React.useContext(SidebarContext)

/** Floating glass source list with a sliding selection and icon-only mode. */
function GlassSidebar({
  className,
  children,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  ...props
}: React.ComponentProps<"aside"> & {
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}) {
  const [inner, setInner] = React.useState(defaultCollapsed)
  const collapsed = collapsedProp ?? inner
  const setCollapsed = React.useCallback(
    (next: boolean) => {
      setInner(next)
      onCollapsedChange?.(next)
    },
    [onCollapsedChange]
  )
  const ref = React.useRef<HTMLDivElement>(null)
  const rect = useActiveIndicator(ref, '[aria-current="page"]')

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <LiquidGlass
        asChild
        variant="frosted"
        className={cn(
          "flex h-full flex-col gap-1 overflow-hidden rounded-[26px] p-2 text-(--glass-foreground) transition-[width] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]",
          collapsed ? "w-[60px]" : "w-60",
          className
        )}
      >
        <aside data-slot="glass-sidebar" data-collapsed={collapsed || undefined} {...props}>
          <div ref={ref} className="relative flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {rect ? (
              <LiquidGlass
                aria-hidden
                shadow={false}
                bezel={10}
                tint="var(--glass-highlight)"
                className="absolute rounded-[14px] transition-[top,height,width] duration-400 ease-[cubic-bezier(0.34,1.25,0.64,1)]"
                style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
              />
            ) : null}
            {children}
          </div>
        </aside>
      </LiquidGlass>
    </SidebarContext.Provider>
  )
}

function GlassSidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  const { collapsed } = useGlassSidebar()
  return (
    <div
      data-slot="glass-sidebar-header"
      className={cn(
        "flex h-11 items-center gap-2",
        collapsed ? "justify-center" : "px-2",
        className
      )}
      {...props}
    />
  )
}

function GlassSidebarGroup({
  className,
  label,
  children,
  ...props
}: React.ComponentProps<"div"> & { label?: string }) {
  const { collapsed } = useGlassSidebar()
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="glass-sidebar-group"
      className={cn("flex flex-col gap-0.5 py-1", className)}
      {...props}
    >
      {label ? (
        <div
          className={cn(
            "h-6 truncate px-3 text-[11px] leading-6 font-semibold tracking-wide uppercase opacity-45 transition-opacity",
            collapsed && "opacity-0"
          )}
        >
          {label}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function GlassSidebarItem({
  className,
  icon,
  active,
  badge,
  asChild,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  icon?: React.ReactNode
  active?: boolean
  badge?: React.ReactNode
  asChild?: boolean
}) {
  const { collapsed } = useGlassSidebar()
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="glass-sidebar-item"
      aria-current={active ? "page" : undefined}
      title={collapsed && typeof children === "string" ? children : undefined}
      className={cn(
        "relative z-10 flex h-10 w-full cursor-pointer items-center gap-3 rounded-[14px] px-[11px] text-left text-[14px] font-medium tracking-[-0.01em] whitespace-nowrap opacity-75 transition-[opacity,background-color] outline-none hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-[current=page]:opacity-100 [&_svg]:size-[18px] [&_svg]:shrink-0",
        !active && "hover:bg-(--glass-highlight)/50",
        collapsed && "justify-center px-0",
        className
      )}
      {...props}
    >
      {icon}
      {asChild ? (
        <Slot.Slottable>{children}</Slot.Slottable>
      ) : (
        <span
          className={cn("flex-1 truncate transition-opacity", collapsed && "hidden")}
        >
          {children}
        </span>
      )}
      {badge != null && !collapsed ? (
        <span className="rounded-full bg-(--glass-highlight) px-1.5 text-[11px] font-semibold tabular-nums">
          {badge}
        </span>
      ) : null}
    </Comp>
  )
}

function GlassSidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-sidebar-footer"
      className={cn("mt-auto flex flex-col gap-1 pt-1", className)}
      {...props}
    />
  )
}

function GlassSidebarToggle({ className, ...props }: React.ComponentProps<"button">) {
  const { collapsed, setCollapsed } = useGlassSidebar()
  return (
    <button
      type="button"
      data-slot="glass-sidebar-toggle"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onClick={() => setCollapsed(!collapsed)}
      className={cn(
        "relative z-10 grid size-11 shrink-0 cursor-pointer place-items-center rounded-[14px] opacity-70 transition-[opacity,background-color] outline-none hover:bg-(--glass-highlight)/50 hover:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:size-[18px]",
        // The 18px icon sits 13px inside the 44px box. Expanded headers add
        // px-2, so pull the toggle to the content edge to line its icon up
        // with item icons (px-[11px]); collapsed headers are already
        // edge-to-edge and centered.
        !collapsed && "-ml-2.5",
        className
      )}
      {...props}
    >
      <HugeiconsIcon icon={PanelLeftIcon} />
    </button>
  )
}

export {
  GlassSidebar,
  GlassSidebarHeader,
  GlassSidebarGroup,
  GlassSidebarItem,
  GlassSidebarFooter,
  GlassSidebarToggle,
  useGlassSidebar,
}
