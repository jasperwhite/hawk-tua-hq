import * as React from "react"

import { cn } from "@/lib/utils"
import { useActiveIndicator } from "@/hooks/use-active-indicator"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type TabBarContextValue = {
  value: string | undefined
  setValue: (value: string) => void
}

const TabBarContext = React.createContext<TabBarContextValue | null>(null)

/** Floating iOS 26 style tab bar with a sliding liquid glass selection. */
function GlassTabBar({
  className,
  children,
  value: valueProp,
  defaultValue,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"nav">, "defaultValue"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const value = valueProp ?? uncontrolled
  const setValue = React.useCallback(
    (next: string) => {
      setUncontrolled(next)
      onValueChange?.(next)
    },
    [onValueChange]
  )
  const ref = React.useRef<HTMLDivElement>(null)
  const rect = useActiveIndicator(ref, '[aria-current="page"]')

  return (
    <TabBarContext.Provider value={{ value, setValue }}>
      <LiquidGlass asChild className={cn("rounded-full p-1", className)}>
        <nav data-slot="glass-tab-bar" {...props}>
          <div ref={ref} className="relative flex items-center">
          {rect ? (
            <LiquidGlass
              aria-hidden
              shadow={false}
              bezel={14}
              tint="var(--glass-highlight)"
              className="absolute rounded-full transition-[left,width] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)]"
              style={{
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
              }}
            />
          ) : null}
          {children}
          </div>
        </nav>
      </LiquidGlass>
    </TabBarContext.Provider>
  )
}

function GlassTabBarItem({
  className,
  value,
  icon,
  label,
  onClick,
  ...props
}: React.ComponentProps<"button"> & {
  value: string
  icon: React.ReactNode
  label: string
}) {
  const ctx = React.useContext(TabBarContext)
  const active = ctx?.value === value

  return (
      <button
        type="button"
        data-slot="glass-tab-bar-item"
        aria-current={active ? "page" : undefined}
        onClick={(e) => {
          ctx?.setValue(value)
          onClick?.(e)
        }}
        className={cn(
          "relative z-10 flex h-14 min-w-18 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full px-3 text-[10px] font-semibold tracking-[0.01em] text-(--glass-foreground) transition-[color,transform] duration-300 outline-none active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-[current=page]:text-[oklch(0.6_0.2_255)] dark:aria-[current=page]:text-[oklch(0.72_0.16_255)] [&_svg]:size-6",
          className
        )}
        {...props}
      >
        {icon}
        <span>{label}</span>
      </button>
  )
}

export { GlassTabBar, GlassTabBarItem }
