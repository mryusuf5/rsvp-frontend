import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { PREMIUM_THEMES, STORE_PRICE } from '../lib/storeItems'

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function PurchaseModal({ item, onConfirm, onClose, buying }) {
  const isTheme = item.type === 'light' || item.type === 'dark' || item.itemKind === 'theme'
  const isFont  = item.itemKind === 'font'

  const [dragY, setDragY] = useState(0)
  const dragging = useRef(false)
  const startY = useRef(0)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function handleTouchStart(e) {
    dragging.current = true
    startY.current = e.touches[0].clientY
  }

  function handleTouchMove(e) {
    if (!dragging.current) return
    const delta = Math.max(0, e.touches[0].clientY - startY.current)
    setDragY(delta)
  }

  function handleTouchEnd() {
    dragging.current = false
    if (dragY > 100) {
      onClose()
    } else {
      setDragY(0)
    }
  }

  const backdropOpacity = Math.max(0, 0.4 - dragY / 300)

  return (
    <>
      <div
        className="fixed inset-0 z-[55]"
        style={{ backgroundColor: `rgba(0,0,0,${backdropOpacity})` }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-shade-white rounded-t-3xl z-[60] px-6 pt-5 pb-10"
        style={{
          transform: `translateX(-50%) translateY(${dragY}px)`,
          transition: dragging.current ? 'none' : 'transform 0.25s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-neutral-3" />
        </div>

        {/* Preview */}
        {isTheme && (
          <div
            className="w-full h-20 rounded-2xl mb-4 flex items-center justify-center gap-3"
            style={{ backgroundColor: item.bg }}
          >
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: item.primary }} />
            <span className="text-[13px] font-semibold" style={{ color: item.primary }}>
              {item.name}
            </span>
          </div>
        )}

        {isFont && (
          <div className="w-full h-20 rounded-2xl mb-4 bg-neutral-1 flex items-center justify-center">
            <span
              className="text-[22px] font-bold text-neutral-6"
              style={{ fontFamily: `'store-${item.id}'` }}
            >
              Aa Bb Cc
            </span>
          </div>
        )}

        <p className="text-[18px] font-bold text-neutral-8 mb-1">{item.name}</p>
        <p className="text-[13px] text-neutral-4 mb-6">
          {isTheme ? (item.type === 'light' ? 'Light theme' : 'Dark theme') : `${item.category} font`}
          {' · '}One-time purchase
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-neutral-1 text-neutral-6 font-semibold text-[15px] rounded-2xl py-3 active:opacity-70"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={buying}
            className="flex-1 bg-primary-1 text-shade-white font-semibold text-[15px] rounded-2xl py-3 active:opacity-80 disabled:opacity-50"
          >
            {buying ? 'Buying…' : `Buy · ${STORE_PRICE}`}
          </button>
        </div>
      </div>
    </>
  )
}

function ThemeSwatch({ theme, owned, onPress, dimmed }) {
  return (
    <button
      onClick={onPress}
      className={`flex flex-col items-center gap-2 active:opacity-70 ${dimmed ? 'opacity-40' : ''}`}
    >
      <div className="relative w-full rounded-2xl border border-neutral-2 overflow-hidden" style={{ height: 72 }}>
        <span className="absolute inset-2 rounded-xl flex items-center justify-center gap-1.5" aria-hidden>
          {['neutral-1', 'neutral-3', 'neutral-5', 'primary-1', 'error-2'].map(token => (
            <span
              key={token}
              className="flex-1 h-full rounded-lg"
              style={{ backgroundColor: `rgb(var(--theme-${theme.id}-${token}))` }}
            />
          ))}
        </span>
        {!owned && (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center rounded-2xl">
            <div className="bg-black/60 rounded-lg px-2 py-1 flex items-center gap-1 text-white">
              <LockIcon />
              <span className="text-[10px] font-bold">{STORE_PRICE}</span>
            </div>
          </div>
        )}
        {owned && (
          <div className="absolute top-1.5 right-1.5 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      <span className="text-[12px] font-semibold text-neutral-6 text-center">{theme.name}</span>
    </button>
  )
}

function FontRow({ font, owned, onPress }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 bg-neutral-1 rounded-2xl px-4 py-3 active:opacity-70 text-left"
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-[18px] font-bold text-neutral-8 truncate"
          style={{ fontFamily: `'store-${font.id}'` }}
        >
          {font.displayName}
        </p>
        <p className="text-[11px] text-neutral-4 mt-0.5 capitalize">{font.category}</p>
      </div>
      {owned ? (
        <span className="text-[11px] font-bold text-green-500 shrink-0">Owned</span>
      ) : (
        <div className="flex items-center gap-1 text-neutral-4 shrink-0">
          <LockIcon />
          <span className="text-[12px] font-semibold">{STORE_PRICE}</span>
        </div>
      )}
    </button>
  )
}

export default function Store() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user && Array.isArray(user.roles)
    ? user.roles.includes('ROLE_ADMIN')
    : user?.isAdmin

  const [fonts, setFonts]               = useState([])
  const [purchasedThemes, setPurchasedThemes] = useState(new Set())
  const [themeConfigs, setThemeConfigs] = useState({})
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [buying, setBuying]             = useState(false)
  const [buyError, setBuyError]         = useState('')
  const [fontTab, setFontTab]           = useState('cartoon')

  // Admin font upload
  const [adminName, setAdminName]       = useState('')
  const [adminCategory, setAdminCategory] = useState('cartoon')
  const [adminUploading, setAdminUploading] = useState(false)
  const [adminError, setAdminError]     = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const fontFileRef = useRef(null)

  useEffect(() => {
    Promise.all([
      api.get('/store/fonts'),
      api.get('/store/purchases'),
      api.get('/store/theme-configs'),
    ]).then(([fontsRes, purchasesRes, configsRes]) => {
      setFonts(Array.isArray(fontsRes.data) ? fontsRes.data : [])
      const themes = new Set(
        (Array.isArray(purchasesRes.data) ? purchasesRes.data : [])
          .filter(p => p.itemType === 'theme')
          .map(p => p.itemId)
      )
      setPurchasedThemes(themes)
      setThemeConfigs(configsRes.data ?? {})
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleBuy() {
    if (!selected) return
    setBuying(true)
    setBuyError('')
    try {
      const isFont = selected.itemKind === 'font'
      await api.post('/store/purchase', {
        itemType: isFont ? 'font' : 'theme',
        itemId:   String(selected.id),
      })
      if (isFont) {
        setFonts(prev => prev.map(f => f.id === selected.id ? { ...f, purchased: true } : f))
        const fontId = `store-${selected.id}`
        document.documentElement.style.setProperty('--c-font-family', `'${fontId}'`)
        try { localStorage.setItem('font', fontId) } catch {}
        api.patch('/me/preferences', { font: fontId }).catch(() => {})
      } else {
        setPurchasedThemes(prev => new Set([...prev, String(selected.id)]))
        document.documentElement.classList.remove('theme-alt')
        document.body?.classList.remove('theme-alt')
        document.getElementById('root')?.classList.remove('theme-alt')
        document.documentElement.dataset.theme = selected.id
        try { localStorage.setItem('theme', selected.id) } catch {}
        api.patch('/me/preferences', { theme: selected.id }).catch(() => {})
      }
      setSelected(null)
    } catch (err) {
      setBuyError(err.response?.data?.detail ?? 'Purchase failed.')
    } finally {
      setBuying(false)
    }
  }

  async function handleAdminUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!adminName.trim()) { setAdminError('Enter a display name first.'); return }
    setAdminUploading(true)
    setAdminError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('displayName', adminName.trim())
      form.append('category', adminCategory)
      const { data } = await api.post('/admin/store/fonts', form)
      setFonts(prev => [...prev, { ...data, purchased: true }])
      setAdminName('')
    } catch (err) {
      setAdminError(err.response?.data?.detail ?? 'Upload failed.')
    } finally {
      setAdminUploading(false)
      if (fontFileRef.current) fontFileRef.current.value = ''
    }
  }

  async function handleAdminToggleFont(id, currentlyActive) {
    if (currentlyActive) {
      if (confirmDeleteId !== id) {
        setConfirmDeleteId(id)
        setTimeout(() => setConfirmDeleteId(null), 2500)
        return
      }
      setConfirmDeleteId(null)
    }
    try {
      const endpoint = currentlyActive ? `/admin/store/fonts/${id}/hide` : `/admin/store/fonts/${id}/restore`
      await api.post(endpoint)
      setFonts(prev => prev.map(f => f.id === id ? { ...f, isActive: !currentlyActive } : f))
    } catch {}
  }

  async function handleAdminToggleTheme(themeId) {
    const currentlyActive = themeConfigs[themeId] !== false
    if (currentlyActive && confirmDeleteId !== `theme-${themeId}`) {
      setConfirmDeleteId(`theme-${themeId}`)
      setTimeout(() => setConfirmDeleteId(null), 2500)
      return
    }
    setConfirmDeleteId(null)
    try {
      const { data } = await api.post(`/admin/store/themes/${themeId}/toggle`)
      setThemeConfigs(prev => ({ ...prev, [themeId]: data.isActive }))
    } catch {}
  }

  const lightThemes = PREMIUM_THEMES.filter(t => t.type === 'light')
  const darkThemes  = PREMIUM_THEMES.filter(t => t.type === 'dark')
  const byCategory  = (cat) => fonts.filter(f => f.category === cat)

  return (
    <div className="flex flex-col min-h-dvh pb-12">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-neutral-1 active:opacity-70 shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-neutral-6">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-[22px] font-bold text-neutral-8">Store</h1>
      </div>

      <div className="px-6 flex flex-col gap-8">
        {/* Themes section */}
        <div>
          <h2 className="text-[17px] font-bold text-neutral-8 mb-4">Themes</h2>

          {['light', 'dark'].map(type => {
            const allList = type === 'light' ? lightThemes : darkThemes
            const list = allList.filter(t => {
              const active = themeConfigs[t.id] !== false
              return active || isAdmin || purchasedThemes.has(t.id)
            })
            if (list.length === 0) return null
            return (
              <div key={type} className="mb-5">
                <p className="text-[12px] font-bold text-neutral-4 uppercase tracking-wider mb-3">
                  {type === 'light' ? 'Light' : 'Dark'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {list.map(theme => {
                    const active = themeConfigs[theme.id] !== false
                    return (
                      <div key={theme.id} className="flex flex-col gap-1">
                        <ThemeSwatch
                          theme={theme}
                          owned={purchasedThemes.has(theme.id)}
                          onPress={() => active && !purchasedThemes.has(theme.id) && setSelected({ ...theme, itemKind: 'theme' })}
                          dimmed={!active}
                        />
                        {isAdmin && (
                          <button
                            onClick={() => handleAdminToggleTheme(theme.id)}
                            className={`text-[11px] font-semibold py-1 rounded-lg transition-all ${
                              confirmDeleteId === `theme-${theme.id}`
                                ? 'bg-red-500 text-white shadow-[0_0_10px_2px_rgba(239,68,68,0.4)]'
                                : active
                                ? 'bg-neutral-1 text-neutral-4'
                                : 'bg-neutral-2 text-primary-1'
                            }`}
                          >
                            {confirmDeleteId === `theme-${theme.id}` ? 'Confirm' : active ? 'Hide' : 'Restore'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Fonts section */}
        <div>
          <h2 className="text-[17px] font-bold text-neutral-8 mb-4">Fonts</h2>

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-neutral-1 animate-pulse" />)}
            </div>
          ) : fonts.length === 0 ? (
            <p className="text-[13px] text-neutral-4">No fonts in the store yet.</p>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                {['cartoon', 'techno', 'classic'].map(cat => {
                  const count = byCategory(cat).length
                  return (
                    <button
                      key={cat}
                      onClick={() => setFontTab(cat)}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-semibold capitalize transition-colors ${fontTab === cat ? 'bg-primary-1 text-shade-white' : 'bg-neutral-1 text-neutral-5'}`}
                    >
                      {cat}{count > 0 && <span className={`text-[11px] ${fontTab === cat ? 'opacity-70' : 'opacity-50'}`}> {count}</span>}
                    </button>
                  )
                })}
              </div>

              {byCategory(fontTab).length === 0 ? (
                <p className="text-[13px] text-neutral-4">No {fontTab} fonts yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {byCategory(fontTab).map(font => (
                    <FontRow
                      key={font.id}
                      font={font}
                      owned={font.purchased}
                      onPress={() => !font.purchased && setSelected({ ...font, itemKind: 'font' })}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
            <p className="text-[11px] font-bold text-primary-1 uppercase tracking-widest mb-4">
              Admin · Upload font
            </p>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Display name (e.g. Comic Wonder)"
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                className="w-full bg-neutral-1 rounded-2xl px-4 py-3 text-[14px] text-neutral-8 placeholder-neutral-4 focus:outline-none focus:ring-2 focus:ring-primary-1"
              />

              <div className="flex gap-2">
                {['cartoon', 'techno', 'classic'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setAdminCategory(cat)}
                    className={`flex-1 py-2 rounded-xl text-[13px] font-semibold capitalize transition-colors ${
                      adminCategory === cat
                        ? 'bg-primary-1 text-shade-white'
                        : 'bg-neutral-1 text-neutral-5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {adminError && (
                <p className="text-[12px] text-error-2">{adminError}</p>
              )}

              <button
                onClick={() => fontFileRef.current?.click()}
                disabled={adminUploading}
                className="w-full bg-primary-1 text-shade-white font-semibold text-[14px] rounded-2xl py-3 active:opacity-80 disabled:opacity-50"
              >
                {adminUploading ? 'Uploading…' : 'Choose font file & upload'}
              </button>
              <input ref={fontFileRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleAdminUpload} />
            </div>

            {/* Uploaded fonts list */}
            {fonts.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {fonts.map(f => (
                  <div key={f.id} className={`flex items-center gap-2 ${!f.isActive ? 'opacity-50' : ''}`}>
                    <p className="flex-1 text-[13px] text-neutral-7 truncate">
                      {f.displayName} <span className="text-neutral-4 capitalize">· {f.category}</span>
                      {!f.isActive && <span className="text-neutral-4"> · hidden</span>}
                    </p>
                    <button
                      onClick={() => handleAdminToggleFont(f.id, f.isActive)}
                      className={`text-[12px] font-semibold px-3 py-1.5 rounded-xl transition-all ${
                        confirmDeleteId === f.id
                          ? 'bg-red-500 text-white shadow-[0_0_12px_2px_rgba(239,68,68,0.5)]'
                          : f.isActive
                          ? 'bg-neutral-1 text-neutral-4 active:opacity-70'
                          : 'bg-neutral-1 text-primary-1 active:opacity-70'
                      }`}
                    >
                      {confirmDeleteId === f.id ? 'Confirm' : f.isActive ? 'Hide' : 'Restore'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Purchase modal */}
      {selected && (
        <PurchaseModal
          item={selected}
          onConfirm={handleBuy}
          onClose={() => { setSelected(null); setBuyError('') }}
          buying={buying}
        />
      )}
      {buyError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-error-2 text-shade-white text-[13px] font-semibold px-4 py-2 rounded-2xl z-[70]">
          {buyError}
        </div>
      )}
    </div>
  )
}
