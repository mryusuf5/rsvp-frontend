import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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
