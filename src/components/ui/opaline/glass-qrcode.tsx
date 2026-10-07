import * as React from "react"
import { encode } from "uqr"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type QRDotStyle = "square" | "rounded" | "dots"

/** uqr marks finder-pattern cells with type 2. */
const POSITION = 2

/** Conventional icon paths, best first. Sites can't be read cross-origin, but images can. */
const ICON_PATHS = [
  "/apple-touch-icon.png",
  "/apple-icon.png",
  "/favicon.svg",
  "/icon.svg",
  "/favicon.ico",
  "/icon.png",
]

const faviconCache = new Map<string, Promise<string | null>>()

function loadImage(src: string, timeout = 4000) {
  return new Promise<boolean>((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => done(false), timeout)
    function done(ok: boolean) {
      clearTimeout(timer)
      img.onload = img.onerror = null
      resolve(ok)
    }
    img.onload = () => done(img.naturalWidth >= 16)
    img.onerror = () => done(false)
    img.src = src
  })
}

/** Finds a site's icon by trying the usual paths. Resolves `null` if none load. */
function findFavicon(origin: string) {
  let found = faviconCache.get(origin)
  if (!found) {
    found = (async () => {
      for (const path of ICON_PATHS) {
        const src = origin + path
        if (await loadImage(src)) return src
      }
      return null
    })()
    faviconCache.set(origin, found)
  }
  return found
}

/** The favicon for an http(s) `value`, or `null` while loading or if there isn't one. */
function useFavicon(value: string, enabled: boolean) {
  const origin = React.useMemo(() => {
    if (!enabled) return null
    try {
      const url = new URL(value)
      return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null
    } catch {
      return null
    }
  }, [value, enabled])
  const [icon, setIcon] = React.useState<{ origin: string; src: string | null } | null>(null)

  React.useEffect(() => {
    if (!origin) return
    let live = true
    findFavicon(origin).then(
      (src) => live && setIcon({ origin, src }),
      () => live && setIcon({ origin, src: null })
    )
    return () => {
      live = false
    }
  }, [origin])

  return origin && icon?.origin === origin ? icon.src : null
}

/**
 * A QR code printed on a glass tile. Finder squares are drawn as soft
 * squircles, modules as dots or rounded squares, and an optional logo sits
 * on its own glass lens in the middle (error correction is raised to `H` so
 * the code still scans). Turn on `lens` for a drifting magnifier.
 *
 * When `value` is a web address, the centre shows that site's favicon. If it
 * can't be loaded, the `logo` you pass is shown instead (or nothing).
 */
function GlassQRCode({
  value,
  size = 220,
  dotStyle = "rounded",
  color = "#0b0b10",
  ecc,
  logo,
  favicon = true,
  lens = false,
  label,
  className,
  ...props
}: Omit<React.ComponentProps<typeof LiquidGlass>, "children"> & {
  /** Text or URL to encode. */
  value: string
  /** Width of the code itself in px; the tile adds padding. */
  size?: number
  dotStyle?: QRDotStyle
  /** Module colour. Keep it dark on the light tile so phones can scan it. */
  color?: string
  /** Error correction level. Defaults to `M`, or `H` with a logo. */
  ecc?: "L" | "M" | "Q" | "H"
  /**
   * Node shown in the centre, e.g. an <img> or an icon. With `favicon`, this
   * is the fallback while the icon loads or when it can't be found.
   */
  logo?: React.ReactNode
  /** Use the favicon of the URL in `value` as the logo. */
  favicon?: boolean
  /** A small glass lens that drifts over the code. */
  lens?: boolean
  /** Caption under the code. */
  label?: React.ReactNode
}) {
  const icon = useFavicon(value, favicon)
  const center = icon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={icon} alt="" referrerPolicy="no-referrer" />
  ) : (
    logo
  )
  const hasLogo = Boolean(center)
  const qr = React.useMemo(
    () => encode(value, { ecc: ecc ?? (hasLogo ? "H" : "M"), border: 0 }),
    [value, ecc, hasLogo]
  )
  const n = qr.size
  const cell = size / n
  // Clear a square in the middle for the logo (about 22% of the code).
  const hole = hasLogo ? Math.ceil(n * 0.22) | 1 : 0
  const holeStart = (n - hole) / 2

  const modules: React.ReactNode[] = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!qr.data[y][x] || qr.types[y][x] === POSITION) continue
      if (hole && x >= holeStart - 0.5 && x < holeStart + hole && y >= holeStart - 0.5 && y < holeStart + hole) continue
      const px = x * cell
      const py = y * cell
      modules.push(
        dotStyle === "dots" ? (
          <circle key={`${x}-${y}`} cx={px + cell / 2} cy={py + cell / 2} r={cell * 0.42} />
        ) : (
          <rect
            key={`${x}-${y}`}
            x={px + cell * 0.04}
            y={py + cell * 0.04}
            width={cell * 0.92}
            height={cell * 0.92}
            rx={dotStyle === "rounded" ? cell * 0.32 : 0}
          />
        )
      )
    }
  }

  // The three finder squares: an outer ring and a solid centre.
  const finders = [
    [0, 0],
    [n - 7, 0],
    [0, n - 7],
  ].map(([fx, fy]) => {
    const r = dotStyle === "square" ? 0 : cell * 2
    return (
      <g key={`${fx}-${fy}`}>
        <rect
          x={fx * cell + cell / 2}
          y={fy * cell + cell / 2}
          width={cell * 6}
          height={cell * 6}
          rx={r}
          fill="none"
          stroke={color}
          strokeWidth={cell}
        />
        <rect
          x={(fx + 2) * cell}
          y={(fy + 2) * cell}
          width={cell * 3}
          height={cell * 3}
          rx={dotStyle === "square" ? 0 : cell * 1.1}
          fill={color}
        />
      </g>
    )
  })

  return (
    <LiquidGlass
      data-slot="glass-qrcode"
      variant="frosted"
      tint="oklch(1 0 0 / 0.78)"
      className={cn("inline-flex w-fit flex-col items-center gap-3 rounded-[28px] p-5 text-[#0b0b10]", className)}
      {...props}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          role="img"
          aria-label={`QR code: ${value}`}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block"
          shapeRendering={dotStyle === "square" ? "crispEdges" : "geometricPrecision"}
        >
          <g fill={color}>{modules}</g>
          {finders}
        </svg>
        {center ? (
          <LiquidGlass
            aria-hidden
            bezel={10}
            tint="oklch(1 0 0 / 0.9)"
            className="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-[30%] [&_img]:size-[70%] [&_img]:object-contain [&_svg]:size-[60%]"
            style={{ width: hole * cell * 0.95, height: hole * cell * 0.95 }}
          >
            {center}
          </LiquidGlass>
        ) : null}
        {lens ? (
          <LiquidGlass
            aria-hidden
            shadow={false}
            bezel={size * 0.11}
            thickness={1.6}
            ior={1.7}
            className="pointer-events-none absolute rounded-full motion-safe:animate-[opaline-qr-lens_9s_ease-in-out_infinite]"
            style={{ width: size * 0.28, height: size * 0.28, left: size * 0.12, top: size * 0.14 }}
          />
        ) : null}
      </div>
      {label ? <div className="max-w-full truncate text-[13px] font-medium opacity-70">{label}</div> : null}
    </LiquidGlass>
  )
}

export { GlassQRCode, type QRDotStyle }
