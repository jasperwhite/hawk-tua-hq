/* Primitives for the new look: plain wrappers over the design system's classes in ds.css.
   No glass, no colour or shape utilities. If a look is wrong, fix the class, not this file.
   Tailwind is used for layout only, and only with token-backed values: its utilities sit in a
   layer, so they cannot override a ds.css class, and they are not trying to. */
import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { RiArrowDownSLine, RiArrowRightUpLine, RiCloseLine } from '@remixicon/react'

import { cn } from '@/lib/utils'

/* The view context stays in hq-ui (the other seven views read it there); re-exported so a
   migrated view imports everything from one place. */
export { useView } from '@/components/hq-ui'

/* The rail and bottom-bar items have no icon rule of their own, so size them from the token. */
const ICON = 'size-(--icon-size) flex-none'

/* Icons are Remix "Line" glyphs: filled compound paths on a 24 grid, currentColor, no stroke —
   the construction the reference uses. .ds-icon in ds.css sizes them from --icon-size. */
export type Glyph = typeof RiCloseLine

export function Icon({ icon: Glyph, className }: { icon: Glyph; className?: string }) {
  return <Glyph aria-hidden className={cn('ds-icon', className)} />
}

/* A tooltip that announces a shortcut: the key in a chip, then a plain label. It shows on hover
   (desktop) and on keyboard focus, never blocks a click, and is hidden from assistive tech —
   the control inside already carries its own aria-label. */
export function Tooltip({
  keys, label, side = 'right', className, children,
}: { keys: string; label: string; side?: 'right' | 'bottom' | 'below' | 'top'; className?: string; children: ReactNode }) {
  return (
    <span className={cn('tip-wrap', className)}>
      {children}
      <span className="tip" data-side={side} aria-hidden="true"><kbd>{keys}</kbd>{label}</span>
    </span>
  )
}

/* A row in a rail that goes somewhere else: no colour change on hover, a trailing arrow fades in. */
export function LinkRow({ href, name, desc }: { href: string; name: string; desc: string }) {
  return (
    <a className="ds-linkrow" href={href} target="_blank" rel="noreferrer">
      <span>{name}</span>
      <span className="ds-linkrow__desc">{desc}</span>
      <Icon icon={RiArrowRightUpLine} className="ds-linkrow__arrow" />
    </a>
  )
}

/* The visible Shortcuts control: the ? key chip and the word, opening the same legend as the key. */
export function ShortcutsButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="rows__row ds-keyrow" aria-haspopup="dialog" onClick={onClick}>
      <kbd>?</kbd>Shortcuts
    </button>
  )
}

/* ---------- chrome ---------- */

export const SkipLink = () => <a className="ds-skip" href="#main">Skip to content</a>

type RailState = { collapsed?: boolean; open?: boolean }
const railAttrs = ({ collapsed, open }: RailState) => ({
  'data-collapsed': collapsed ? '' : undefined,
  'data-open': open ? '' : undefined,
  inert: collapsed,
})

export function RailNav({
  id, label, brand, foot, children, className, ...state
}: { id: string; label: string; brand: ReactNode; foot?: ReactNode; children: ReactNode; className?: string } & RailState) {
  return (
    <nav className={cn('rail-nav', className)} id={id} aria-label={label} {...railAttrs(state)}>
      <div className="rail-nav__inner">
        <div className="rail-nav__body">
          <div className="rail-nav__brand">{brand}</div>
          {children}
        </div>
        {foot && <div className="rail-nav__theme">{foot}</div>}
      </div>
    </nav>
  )
}

export const RailNavBrand = (props: ComponentProps<'a'>) => <a {...props} className="rail-nav__brand-link" />
export const RailNavList = ({ children }: { children: ReactNode }) => <ul className="rail-nav__list">{children}</ul>
export const RailNavDivider = () => <hr className="rail-nav__divider" />

export function RailNavItem({
  icon, current, children, ...rest
}: { icon?: Glyph; current?: boolean; children: ReactNode } & Omit<ComponentProps<'a'>, 'children'>) {
  return (
    <li>
      <a {...rest} className="rail-nav__item" aria-current={current ? 'page' : undefined}>
        {icon && <Icon icon={icon} className={ICON} />}
        {children}
      </a>
    </li>
  )
}

export function InfoRail({
  id, title, children, className, ...state
}: { id: string; title: ReactNode; children: ReactNode; className?: string } & RailState) {
  return (
    <aside className={cn('info-rail', className)} id={id} aria-labelledby={`${id}-title`} {...railAttrs(state)}>
      <div className="info-rail__inner">
        <h2 className="info-rail__title" id={`${id}-title`}>{title}</h2>
        {children}
      </div>
    </aside>
  )
}

export function Toolbar({ title, start, end }: { title: ReactNode; start?: ReactNode; end?: ReactNode }) {
  return (
    <header className="toolbar">
      {start}
      <h1 className="toolbar__title">{title}</h1>
      {end}
    </header>
  )
}

export function IconButton({
  icon, label, spin, ...rest
}: { icon: Glyph; label: string; spin?: boolean } & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button type="button" {...rest} className="icon-btn" aria-label={label}>
      <Icon icon={icon} className={cn(spin && 'motion-safe:animate-spin')} />
    </button>
  )
}

export function BottomBar({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav className="ds-bottombar" aria-label={label}>
      <div className="ds-bottombar__list">{children}</div>
    </nav>
  )
}

export function BottomBarItem({
  icon, label, current, ...rest
}: { icon: Glyph; label: string; current?: boolean } & Omit<ComponentProps<'a'>, 'children'>) {
  return (
    <a {...rest} className="ds-bottombar__item" aria-label={label} title={label} aria-current={current ? 'page' : undefined}>
      <Icon icon={icon} className={ICON} />
    </a>
  )
}

export function BottomBarButton({
  icon, label, ...rest
}: { icon: Glyph; label: string } & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button type="button" {...rest} className="ds-bottombar__item" aria-label={label} title={label}>
      <Icon icon={icon} className={ICON} />
    </button>
  )
}

/* The shortcut legend: a floating panel that blurs in. Focus moves into it on open and back
   to where it was on close; the caller makes everything behind it inert. */
export function Legend({
  open, onClose, items,
}: { open: boolean; onClose: () => void; items: readonly (readonly [string, string])[] }) {
  const close = useRef<HTMLButtonElement>(null)
  const back = useRef<Element | null>(null)
  useEffect(() => {
    if (open) { back.current = document.activeElement; close.current?.focus() }
    else if (back.current) { (back.current as HTMLElement).focus?.(); back.current = null }
  }, [open])
  return (
    <div
      className="legend" role="dialog" aria-modal="true" aria-labelledby="legend-title"
      aria-hidden={!open} inert={!open} data-open={open ? '' : undefined}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="legend__panel">
        <div className="legend__head">
          <h2 className="legend__title" id="legend-title">Shortcuts</h2>
          <button ref={close} type="button" className="icon-btn" aria-label="Close shortcuts" onClick={onClose}>
            <Icon icon={RiCloseLine} />
          </button>
        </div>
        <dl className="legend__list">
          {items.map(([k, what]) => (
            <div className="legend__row" key={k}><dt><kbd>{k}</kbd></dt><dd>{what}</dd></div>
          ))}
        </dl>
      </div>
    </div>
  )
}

/* ---------- controls ---------- */

/* Text segments, or with `icons` the three-icon track the theme switch uses. */
export function Segmented<T extends string>({
  value, onChange, options, label, icons, className,
}: {
  value: T; onChange: (v: T) => void; options: readonly (readonly [T, string])[]
  label: string; icons?: Partial<Record<T, Glyph>>; className?: string
}) {
  return (
    <div className={cn('seg', icons && 'seg--track seg--icons', className)} role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button
          key={v} type="button" className="seg__btn" aria-pressed={value === v}
          aria-label={icons ? l : undefined}
          onClick={() => onChange(v)}
        >
          {icons?.[v] ? <Icon icon={icons[v]} /> : l}
        </button>
      ))}
    </div>
  )
}

export const Action = ({ type = 'button', ...rest }: ComponentProps<'button'>) => (
  <button type={type} {...rest} className={cn('ds-action', rest.className)} />
)
export const Input = (props: ComponentProps<'input'>) => <input {...props} className={cn('ds-input', props.className)} />
/* A real <select> with the OS arrow switched off and our own glyph laid over its right edge. */
export function Select({ className, ...rest }: ComponentProps<'select'>) {
  return (
    <span className={cn('ds-select', className)}>
      <select {...rest} className="ds-input" />
      <Icon icon={RiArrowDownSLine} className="ds-select__icon" />
    </span>
  )
}

/* ---------- content ---------- */

export function InfoPairs({ items }: { items: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className="info">
      {items.map(([k, v]) => (
        <div className="info__pair" key={k}>
          <dt className="info__label">{k}</dt>
          <dd className="info__value"><span>{v}</span></dd>
        </div>
      ))}
    </dl>
  )
}

/* A group label: ordinary text in the secondary grey. */
export const GroupLabel = ({ children, ...rest }: ComponentProps<'h2'>) => <h2 {...rest} className={cn('rows__group-label', rest.className)}>{children}</h2>

export function DsTable({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="ds-table">{children}</table></div>
}

export function Note({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="ds-note">
      <p className="ds-note__title">{title}</p>
      {children}
    </div>
  )
}

export const Prose = ({ className, ...rest }: ComponentProps<'p'>) => <p {...rest} className={cn('ds-prose', className)} />
