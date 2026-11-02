/* The theme, in one place. It lives here rather than in main.tsx because App imports it
   and main imports App, which was a cycle — it worked, but only because nothing ran at
   module scope.

   One preference, two mechanisms: the design system keys off data-theme, the Opaline
   components the other tabs still use key off a .dark class. Both follow the same choice.
   'system' means no data-theme attribute, so tokens.css's prefers-color-scheme block wins. */

export type Theme = 'system' | 'light' | 'dark'
export const THEMES: Theme[] = ['system', 'light', 'dark']

const KEY = 'hq-theme'
const mq = window.matchMedia('(prefers-color-scheme: dark)')

export function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'light' || t === 'dark' || t === 'system') return t
  } catch { /* private window, blocked storage */ }
  return 'system'
}

export function applyTheme(t: Theme) {
  const el = document.documentElement
  if (t === 'system') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', t)
  el.classList.toggle('dark', t === 'dark' || (t === 'system' && mq.matches))
  try { localStorage.setItem(KEY, t) } catch { /* nothing to do */ }
}

/* Follow the OS while the choice is 'system'. */
export function watchSystemTheme() {
  const on = () => { if (readTheme() === 'system') applyTheme('system') }
  mq.addEventListener('change', on)
  return () => mq.removeEventListener('change', on)
}
