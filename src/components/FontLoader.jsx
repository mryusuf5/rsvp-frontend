import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'

function syncPreferences() {
  const localFont  = localStorage.getItem('font')  || 'inter'
  const localTheme = localStorage.getItem('theme') || 'basic'
  api.get('/me').then(r => {
    const patch = {}
    if (r.data.font  !== localFont)  patch.font  = localFont
    if (r.data.theme !== localTheme) patch.theme = localTheme
    if (Object.keys(patch).length > 0) {
      api.patch('/me/preferences', patch).catch(() => {})
    }
  }).catch(() => {})
}

async function loadFontBlob(url, styleId, family) {
  if (document.getElementById(styleId)) return
  try {
    const res = await api.get(url, { responseType: 'blob' })
    const blobUrl = URL.createObjectURL(res.data)
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `@font-face { font-family: '${family}'; src: url('${blobUrl}'); }`
    document.head.appendChild(style)
  } catch {}
}

export default function FontLoader() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    syncPreferences()

    // Personal custom fonts
    api.get('/fonts').then(async res => {
      const list = res.data['hydra:member'] ?? res.data
      await Promise.all(list.map(f =>
        loadFontBlob(`/fonts/${f.id}/file`, `custom-font-face-${f.id}`, `custom-${f.id}`)
      ))
      const savedFont = localStorage.getItem('font')
      if (savedFont?.startsWith('custom-')) {
        const apiId = parseInt(savedFont.replace('custom-', ''), 10)
        if (list.some(f => f.id === apiId)) {
          document.documentElement.style.setProperty('--c-font-family', `'custom-${apiId}'`)
        }
      }
    }).catch(() => {})

    // Store fonts — load all for preview, apply saved font if purchased
    api.get('/store/fonts').then(async res => {
      const list = Array.isArray(res.data) ? res.data : []
      await Promise.all(list.map(f =>
        loadFontBlob(`/store/fonts/${f.id}/file`, `store-font-face-${f.id}`, `store-${f.id}`)
      ))
      const savedFont = localStorage.getItem('font')
      if (savedFont?.startsWith('store-')) {
        const storeId = parseInt(savedFont.replace('store-', ''), 10)
        if (list.some(f => f.id === storeId && f.purchased)) {
          document.documentElement.style.setProperty('--c-font-family', `'store-${storeId}'`)
        }
      }
    }).catch(() => {})
  }, [user])

  return null
}
