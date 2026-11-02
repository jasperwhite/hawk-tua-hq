import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './app.css'
/* tokens.css AFTER the Opaline theme: it redefines --accent, and import order decides.
   ds.css is the design system's own classes, ported from ~/Claude/Design System/blocks. */
import './tokens.css'
import './ds.css'
import App from './App'
import { applyTheme, readTheme, watchSystemTheme } from '@/lib/theme'

applyTheme(readTheme())
watchSystemTheme()

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
