import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './app.css'
import App from './App'

// shadcn themes key off a `.dark` class; follow the system setting
const mq = window.matchMedia('(prefers-color-scheme: dark)')
const applyTheme = () => document.documentElement.classList.toggle('dark', mq.matches)
applyTheme()
mq.addEventListener('change', applyTheme)

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
