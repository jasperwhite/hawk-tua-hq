"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  preloadDisplacementMap,
  supportsLiquidGlass,
} from "@/lib/glass-refraction"

/** Canvas padding (CSS px) so the contact shadow isn't clipped. */
const PAD = 18

type GlyphMaps = {
  mask: string
  map: string
  light: string
  shadow: string
  width: number
  height: number
}

function blurred(source: HTMLCanvasElement, radius: number) {
  const c = document.createElement("canvas")
  c.width = source.width
  c.height = source.height
  const ctx = c.getContext("2d", { willReadFrequently: true })!
  ctx.filter = `blur(${radius}px)`
  ctx.drawImage(source, 0, 0)
  return ctx.getImageData(0, 0, c.width, c.height).data
}

function toUrl(data: ImageData) {
  const c = document.createElement("canvas")
  c.width = data.width
  c.height = data.height
  c.getContext("2d")!.putImageData(data, 0, 0)
  return c.toDataURL()
}

/**
 * Rasterises the text in the element's own font and derives, from the glyph
 * shapes: an alpha mask, a bevel displacement map, a lighting pass (rim light,
 * body sheen, inner shade) and a contact shadow.
 */
function buildGlyphMaps(
  el: HTMLElement,
  text: string,
  baseline: number,
  bevel: number
): GlyphMaps | null {
  const width = el.offsetWidth + PAD * 2
  const height = el.offsetHeight + PAD * 2
  if (width <= PAD * 2 || height <= PAD * 2) return null

  const style = getComputedStyle(el)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.ceil(width * dpr)
  const h = Math.ceil(height * dpr)

  const glyphs = document.createElement("canvas")
  glyphs.width = w
  glyphs.height = h
  const g = glyphs.getContext("2d", { willReadFrequently: true })
  if (!g) return null
  g.scale(dpr, dpr)
  g.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  const spacing = parseFloat(style.letterSpacing)
  if (!Number.isNaN(spacing) && "letterSpacing" in g) {
    ;(g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`
  }
  g.textBaseline = "alphabetic"
  g.fillStyle = "#fff"
  g.fillText(text, PAD, PAD + baseline)
  const alpha = g.getImageData(0, 0, w, h).data

  const soft = blurred(glyphs, bevel * dpr * 0.5) // bevel → refraction + shading
  const sharp = blurred(glyphs, 1.1 * dpr) // crisp edge → rim light
  const halo = blurred(glyphs, 7 * dpr) // contact shadow

  const at = (field: Uint8ClampedArray, x: number, y: number) => {
    const v = field[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 4 + 3] / 255
    return v * v * (3 - 2 * v)
  }

  // Normalise gradients so the steepest point of each field maps to 1.
  const gx = new Float32Array(w * h)
  const gy = new Float32Array(w * h)
  const rx = new Float32Array(w * h)
  const ry = new Float32Array(w * h)
  let maxSoft = 1e-6
  let maxSharp = 1e-6
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (alpha[i * 4 + 3] === 0) continue
      gx[i] = at(soft, x + 1, y) - at(soft, x - 1, y)
      gy[i] = at(soft, x, y + 1) - at(soft, x, y - 1)
      rx[i] = at(sharp, x + 1, y) - at(sharp, x - 1, y)
      ry[i] = at(sharp, x, y + 1) - at(sharp, x, y - 1)
      maxSoft = Math.max(maxSoft, Math.hypot(gx[i], gy[i]))
      maxSharp = Math.max(maxSharp, Math.hypot(rx[i], ry[i]))
    }
  }

  const map = new ImageData(w, h)
  const light = new ImageData(w, h)
  const shadow = new ImageData(w, h)
  // Light from the top-left; an edge is lit when its outward normal faces it.
  const lx = -0.55
  const ly = -0.835
  const shadowOffset = Math.round(3 * dpr)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const p = i * 4
      const a = alpha[p + 3] / 255

      // Contact shadow: only outside the glyphs, nudged downwards.
      const sy = Math.max(0, y - shadowOffset)
      const s = halo[(sy * w + x) * 4 + 3] / 255
      shadow.data[p + 3] = 255 * s * 0.22 * (1 - a)

      let dx = 0
      let dy = 0
      if (a > 0) {
        const softSlope = Math.hypot(gx[i], gy[i]) / maxSoft
        const rimSlope = Math.hypot(rx[i], ry[i]) / maxSharp
        dx = -gx[i] / maxSoft
        dy = -gy[i] / maxSoft

        const len = Math.hypot(rx[i], ry[i]) || 1
        const facing = (-rx[i] / len) * lx + (-ry[i] / len) * ly
        const rim = Math.pow(rimSlope, 1.4) * (0.3 + 0.7 * Math.max(0, facing))
        const sheen = 0.16 * (1 - y / h) // body is lighter towards the top
        const shade = softSlope * Math.max(0, -facing) * 0.2

        const white = Math.min(1, rim * 0.95 + sheen)
        if (white >= shade) {
          light.data[p] = light.data[p + 1] = light.data[p + 2] = 255
          light.data[p + 3] = 255 * a * white
        } else {
          light.data[p + 3] = 255 * a * shade
        }
      }
      map.data[p] = 128 + dx * 127
      map.data[p + 1] = 128 + dy * 127
      map.data[p + 2] = 128
      map.data[p + 3] = 255
    }
  }

  return {
    mask: glyphs.toDataURL(),
    map: toUrl(map),
    light: toUrl(light),
    shadow: toUrl(shadow),
    width,
    height,
  }
}

/**
 * Display text cast in liquid glass. Each glyph is a bevelled lens that bends
 * whatever sits behind it, with a crisp rim light, a soft top-lit body, an
 * optional travelling sheen and a contact shadow. Best for single-line
 * headlines over imagery or gradients.
 */
function GlassText({
  children,
  className,
  bevel = 12,
  refraction = 22,
  dispersion = 0.06,
  shine = true,
  tint = "oklch(1 0 0 / 0.08)",
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  children: string
  /** Width of the rounded glyph edge in px. */
  bevel?: number
  /** How strongly the glyphs bend the backdrop, in px. */
  refraction?: number
  /** Chromatic dispersion at the glyph edges (0 – 1). Keep it subtle. */
  dispersion?: number
  /** Animate a soft specular sweep across the letters. */
  shine?: boolean
  /** Colour filling the glyphs. */
  tint?: string
}) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const marker = React.useRef<HTMLSpanElement>(null)
  const id = "gt" + React.useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const [maps, setMaps] = React.useState<GlyphMaps | null>(null)
  const [refracts, setRefracts] = React.useState(false)

  React.useLayoutEffect(() => setRefracts(supportsLiquidGlass()), [])

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false
    let frame = 0
    const build = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const baseline = marker.current?.offsetTop ?? el.offsetHeight * 0.8
        const next = buildGlyphMaps(el, children, baseline, bevel)
        if (!next) return
        preloadDisplacementMap(next.map).then(() => !cancelled && setMaps(next))
      })
    }
    document.fonts?.ready.then(() => !cancelled && build())
    const ro = new ResizeObserver(build)
    ro.observe(el)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [children, bevel])

  const layer = "pointer-events-none absolute"
  const inset = { inset: -PAD } as const
  const masked: React.CSSProperties | undefined = maps
    ? {
        ...inset,
        maskImage: `url(${maps.mask})`,
        WebkitMaskImage: `url(${maps.mask})`,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
      }
    : undefined
  const backdrop =
    maps && refracts ? `url(#${id})` : "blur(8px) saturate(1.6) brightness(1.1)"

  return (
    <span
      ref={ref}
      data-slot="glass-text"
      className={cn("relative inline-block whitespace-nowrap", className)}
      {...props}
    >
      {/* Real text: keeps layout, selection and accessibility. */}
      <span className={cn("relative", maps ? "text-transparent" : "opacity-40")}>{children}</span>
      <span ref={marker} aria-hidden className="inline-block h-0 w-0 align-baseline" />
      {maps ? (
        <>
          <span
            aria-hidden
            className={layer}
            style={{ ...inset, backgroundImage: `url(${maps.shadow})`, backgroundSize: "100% 100%" }}
          />
          <span
            aria-hidden
            className={layer}
            style={{ ...masked, backdropFilter: backdrop, WebkitBackdropFilter: backdrop, background: tint }}
          />
          <span
            aria-hidden
            className={layer}
            style={{ ...inset, backgroundImage: `url(${maps.light})`, backgroundSize: "100% 100%" }}
          />
          {shine ? (
            <span
              aria-hidden
              className={cn(
                layer,
                "animate-[opaline-sheen_5s_ease-in-out_infinite] bg-[linear-gradient(110deg,transparent_42%,oklch(1_0_0/0.4)_50%,transparent_58%)] bg-[length:260%_100%] motion-reduce:hidden"
              )}
              style={masked}
            />
          ) : null}
          {refracts ? (
            <svg aria-hidden width="0" height="0" className="absolute size-0">
              <filter
                id={id}
                x="0"
                y="0"
                width={maps.width}
                height={maps.height}
                filterUnits="userSpaceOnUse"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="soft" />
                <feImage
                  href={maps.map}
                  x="0"
                  y="0"
                  width={maps.width}
                  height={maps.height}
                  preserveAspectRatio="none"
                  result="map"
                />
                {(
                  [
                    [1, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0", "r"],
                    [1 - dispersion, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0", "g"],
                    [1 - dispersion * 2, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0", "b"],
                  ] as const
                ).map(([k, matrix, channel]) => (
                  <React.Fragment key={channel}>
                    <feDisplacementMap
                      in="soft"
                      in2="map"
                      scale={refraction * k}
                      xChannelSelector="R"
                      yChannelSelector="G"
                      result={`d${channel}`}
                    />
                    <feColorMatrix in={`d${channel}`} type="matrix" values={matrix} result={channel} />
                  </React.Fragment>
                ))}
                <feBlend in="r" in2="g" mode="screen" result="rg" />
                <feBlend in="rg" in2="b" mode="screen" result="rgb" />
                <feColorMatrix in="rgb" type="saturate" values="1.25" />
              </filter>
            </svg>
          ) : null}
        </>
      ) : null}
    </span>
  )
}

export { GlassText }
