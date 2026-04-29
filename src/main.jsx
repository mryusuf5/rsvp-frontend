import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Apply font early to avoid flash.
try {
  const fontMap = {
    inter: "'Inter', system-ui, sans-serif",
    roboto: "'Roboto', sans-serif",
    'open-sans': "'Open Sans', sans-serif",
    nunito: "'Nunito', sans-serif",
    lato: "'Lato', sans-serif",
    merriweather: "'Merriweather', serif",
    lora: "'Lora', serif",
    playfair: "'Playfair Display', serif",
    crimson: "'Crimson Text', serif",
    'source-code': "'Source Code Pro', monospace",
  }
  const savedFont = localStorage.getItem('font')
  if (savedFont && fontMap[savedFont]) {
    document.documentElement.style.setProperty('--c-font-family', fontMap[savedFont])
  }
} catch {}

// Apply theme early to avoid flash.
try {
  // Back-compat cleanup: older builds used a class toggle.
  document.documentElement.classList.remove('theme-alt')
  document.body?.classList.remove('theme-alt')
  document.getElementById('root')?.classList.remove('theme-alt')

  const theme = localStorage.getItem('theme')
  if (theme) {
    document.documentElement.dataset.theme = theme
  } else if (localStorage.getItem('themeAlt') === '1') {
    // Back-compat: old toggle meant "purple".
    document.documentElement.dataset.theme = 'purple'
    localStorage.setItem('theme', 'purple')
    localStorage.removeItem('themeAlt')
  }
} catch {
  // ignore
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
