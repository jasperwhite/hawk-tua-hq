"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown"

/** Brand from the card number's prefix. */
function detectBrand(number: string): CardBrand {
  const n = number.replace(/\D/g, "")
  if (/^4/.test(n)) return "visa"
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard"
  if (/^3[47]/.test(n)) return "amex"
  if (/^(6011|65|64[4-9])/.test(n)) return "discover"
  return "unknown"
}

/** Groups digits the way the brand prints them; masks all but the last four. */
function formatNumber(number: string, brand: CardBrand, mask: boolean) {
  const digits = number.replace(/\D/g, "")
  const shown = mask ? digits.replace(/\d(?=\d{4})/g, "•") : digits
  const groups = brand === "amex" ? [4, 6, 5] : [4, 4, 4, 4]
  const out: string[] = []
  let i = 0
  for (const g of groups) {
    if (i >= shown.length) break
    out.push(shown.slice(i, i + g))
    i += g
  }
  if (i < shown.length) out.push(shown.slice(i))
  return out.join(" ")
}

const gradients: Record<string, string> = {
  aurora: "linear-gradient(135deg, oklch(0.72 0.16 300 / 0.55), oklch(0.75 0.14 220 / 0.45) 55%, oklch(0.82 0.12 170 / 0.4))",
  midnight: "linear-gradient(135deg, oklch(0.32 0.05 270 / 0.75), oklch(0.22 0.03 260 / 0.7))",
  sunset: "linear-gradient(135deg, oklch(0.78 0.15 40 / 0.55), oklch(0.68 0.2 10 / 0.5) 60%, oklch(0.6 0.2 330 / 0.45))",
  clear: "transparent",
}

function BrandMark({ brand }: { brand: CardBrand }) {
  if (brand === "mastercard")
    return (
      <svg viewBox="0 0 48 30" className="h-8 w-auto" aria-label="Mastercard">
        <circle cx="17" cy="15" r="13" fill="#eb001b" />
        <circle cx="31" cy="15" r="13" fill="#f79e1b" fillOpacity="0.9" />
        <path d="M24 4.2a13 13 0 0 1 0 21.6 13 13 0 0 1 0-21.6Z" fill="#ff5f00" />
      </svg>
    )
  const text = { visa: "VISA", amex: "AMEX", discover: "DISCOVER", unknown: "" }[brand]
  if (!text) return null
  return (
    <span
      aria-label={text}
      className={cn(
        "font-black tracking-[-0.02em]",
        brand === "visa" ? "text-[26px] italic" : "text-[15px] tracking-[0.04em]"
      )}
    >
      {text}
    </span>
  )
}

function Chip() {
  return (
    <svg viewBox="0 0 44 34" className="h-8 w-auto" aria-hidden>
      <defs>
        <linearGradient id="opaline-chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5e3a7" />
          <stop offset="0.5" stopColor="#d4ad5d" />
          <stop offset="1" stopColor="#f1d999" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="42" height="32" rx="6" fill="url(#opaline-chip)" />
      <path
        d="M1 12h12m-12 10h12m18-10h12m-12 10h12M15 1v32m14-32v32M15 12h14v10H15z"
        fill="none"
        stroke="#9a7a35"
        strokeOpacity="0.6"
        strokeWidth="1"
      />
    </svg>
  )
}

/**
 * A payment card made of glass. It tilts towards the pointer, flips to show
 * the back on click or when `flipped` changes, detects the brand from the
 * number, and masks it unless `mask` is off.
 */
function GlassCreditCard({
  number,
  name,
  expiry,
  cvc,
  brand: brandProp,
  mask = true,
  flipped: flippedProp,
  defaultFlipped = false,
  onFlippedChange,
  flipOnClick = true,
  tilt = true,
  gradient = "aurora",
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "onClick"> & {
  number: string
  name: string
  /** `MM/YY`. */
  expiry: string
  cvc?: string
  /** Overrides the brand detected from the number. */
  brand?: CardBrand
  /** Hide all but the last four digits. */
  mask?: boolean
  flipped?: boolean
  defaultFlipped?: boolean
  onFlippedChange?: (flipped: boolean) => void
  flipOnClick?: boolean
  /** Tilt towards the pointer. */
  tilt?: boolean
  /** `aurora`, `midnight`, `sunset`, `clear`, or any CSS background. */
  gradient?: string
}) {
  const [inner, setInner] = React.useState(defaultFlipped)
  const flipped = flippedProp ?? inner
  const brand = brandProp ?? detectBrand(number)
  const [angle, setAngle] = React.useState({ x: 0, y: 0 })
  const tint = gradients[gradient] ?? gradient
  const dark = gradient === "midnight"

  const flip = () => {
    setInner(!flipped)
    onFlippedChange?.(!flipped)
  }

  // Each face carries its own 3D transform, so no preserve-3d parent is
  // needed: that would flatten the backdrop and stop the glass refracting.
  const face = (back: boolean): React.CSSProperties => ({
    transform: `perspective(1100px) rotateX(${angle.x}deg) rotateY(${(flipped ? 180 : 0) + (back ? 180 : 0) + angle.y}deg)`,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
  })
  const faceClass =
    "absolute inset-0 flex flex-col overflow-hidden rounded-[18px] p-5 transition-transform duration-700 ease-[cubic-bezier(0.34,1.2,0.64,1)]"

  return (
    <div
      data-slot="glass-credit-card"
      data-flipped={flipped || undefined}
      role={flipOnClick ? "button" : undefined}
      tabIndex={flipOnClick ? 0 : undefined}
      aria-label={flipOnClick ? (flipped ? "Show front of card" : "Show back of card") : undefined}
      className={cn(
        "relative aspect-[1.586] w-[340px] max-w-full shrink-0 rounded-[18px] outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
        flipOnClick && "cursor-pointer",
        dark ? "text-white" : "text-(--glass-foreground)",
        className
      )}
      onClick={flipOnClick ? flip : undefined}
      onKeyDown={(e) => {
        if (flipOnClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          flip()
        }
      }}
      onPointerMove={(e) => {
        if (!tilt || e.pointerType !== "mouse") return
        const r = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width - 0.5
        const py = (e.clientY - r.top) / r.height - 0.5
        setAngle({ x: -py * 10, y: px * 14 })
      }}
      onPointerLeave={() => setAngle({ x: 0, y: 0 })}
      {...props}
    >
      <LiquidGlass className={faceClass} style={face(false)} bezel={18} tint={tint} aria-hidden={flipped}>
        <div className="flex items-start justify-between">
          <Chip />
          <svg viewBox="0 0 24 24" className="size-6 opacity-70" aria-hidden>
            <path
              d="M8.5 7.5a7 7 0 0 1 0 9m3.5-11a10 10 0 0 1 0 13m3.5-15a13 13 0 0 1 0 17"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="mt-auto font-mono text-[19px] tracking-[0.12em] tabular-nums [text-shadow:0_1px_1px_rgb(0_0_0/0.15)]">
          {formatNumber(number, brand, mask)}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9.5px] tracking-[0.14em] uppercase opacity-60">Card holder</div>
            <div className="truncate text-[14px] font-semibold tracking-[0.04em] uppercase">{name}</div>
          </div>
          <div className="shrink-0">
            <div className="text-[9.5px] tracking-[0.14em] uppercase opacity-60">Expires</div>
            <div className="font-mono text-[14px] font-semibold">{expiry}</div>
          </div>
          <div className="shrink-0 self-end">
            <BrandMark brand={brand} />
          </div>
        </div>
      </LiquidGlass>

      <LiquidGlass className={cn(faceClass, "px-0")} style={face(true)} bezel={18} tint={tint} aria-hidden={!flipped}>
        <div className="mt-3 h-10 w-full bg-[#141418]/85" />
        <div className="mt-5 flex items-center gap-3 px-5">
          <div className="h-9 flex-1 rounded-md bg-[repeating-linear-gradient(-45deg,rgb(255_255_255/0.75)_0_6px,rgb(255_255_255/0.55)_6px_12px)]" />
          <div className="grid h-9 min-w-14 place-items-center rounded-md bg-white px-2 font-mono text-[14px] font-semibold text-[#141418] italic">
            {cvc ?? "•••"}
          </div>
        </div>
        <div className="mt-auto flex items-end justify-between px-5 text-[10px] leading-snug opacity-60">
          <p className="max-w-[70%]">This card is property of the issuer. If found, please return it.</p>
          <BrandMark brand={brand} />
        </div>
      </LiquidGlass>
    </div>
  )
}

export { GlassCreditCard, detectBrand, formatNumber, type CardBrand }
