"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

/**
 * Slider whose thumb morphs into a liquid glass lens while dragging,
 * refracting the track beneath it.
 */
function GlassSlider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min],
    [value, defaultValue, min]
  )

  return (
    <SliderPrimitive.Root
      data-slot="glass-slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "group/slider relative flex w-full touch-none items-center py-3 select-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="glass-slider-track"
        className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[oklch(0.5_0.01_286/0.22)] dark:bg-[oklch(1_0_0/0.16)]"
      >
        <SliderPrimitive.Range
          data-slot="glass-slider-range"
          className="absolute h-full rounded-full bg-[oklch(0.62_0.19_255)]"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb key={index} asChild>
          <LiquidGlass
            data-slot="glass-slider-thumb"
            bezel={10}
            thickness={2.1}
            className="group/thumb block h-6 w-10 cursor-grab rounded-full outline-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.45,0.64,1)] focus-visible:ring-[3px] focus-visible:ring-ring/40 active:scale-[1.45] active:cursor-grabbing"
          >
            <span className="absolute inset-0 rounded-full bg-white shadow-[0_2px_8px_rgb(0_0_0/0.18)] transition-opacity duration-300 group-active/thumb:opacity-0" />
          </LiquidGlass>
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  )
}

export { GlassSlider }
