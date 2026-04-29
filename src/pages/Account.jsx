import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import api, { resolveUrl } from '../lib/api'
import { checkTierBadges } from '../lib/badges'
import { FONT_NAMES, THEME_NAMES } from '../lib/readerSettings'
import { PREMIUM_THEMES } from '../lib/storeItems'
import BadgeToast from '../components/BadgeToast'
import BadgesSection from '../components/BadgesSection'
import FollowListSheet from '../components/FollowListSheet'

const WPM_OPTIONS = [100, 150, 200, 250, 300, 350, 400, 500, 600]

const FONTS = [
  { id: 'inter',       name: 'Inter',            value: "'Inter', system-ui, sans-serif" },
  { id: 'roboto',      name: 'Roboto',            value: "'Roboto', sans-serif" },
  { id: 'open-sans',   name: 'Open Sans',         value: "'Open Sans', sans-serif" },
  { id: 'nunito',      name: 'Nunito',            value: "'Nunito', sans-serif" },
  { id: 'lato',        name: 'Lato',              value: "'Lato', sans-serif" },
  { id: 'merriweather',name: 'Merriweather',      value: "'Merriweather', serif" },
  { id: 'lora',        name: 'Lora',              value: "'Lora', serif" },
  { id: 'playfair',    name: 'Playfair Display',  value: "'Playfair Display', serif" },
  { id: 'crimson',     name: 'Crimson Text',      value: "'Crimson Text', serif" },
  { id: 'source-code', name: 'Source Code Pro',   value: "'Source Code Pro', monospace" },
]

const THEME_GROUPS = [
  {
    label: 'Light themes',
    themes: [
      { id: 'basic', name: 'Basic' },
      { id: 'pink', name: 'Pink' },
      { id: 'purple', name: 'Purple' },
      { id: 'mint', name: 'Mint green' },
      { id: 'turquoise', name: 'Turquoise' },
      { id: 'bw', name: 'Black & white' },
      { id: 'sunset', name: 'Sunset' },
      { id: 'forest', name: 'Forest' },
      { id: 'sand', name: 'Sand' },
    ],
  },
  {
    label: 'Dark themes',
    themes: [
      { id: 'dark', name: 'Dark' },
      { id: 'darkred', name: 'Dark red' },
      { id: 'darkviolet', name: 'Dark violet' },
      { id: 'darkneon', name: 'Neon green' },
      { id: 'darkneonblue', name: 'Neon blue' },
      { id: 'darkneonred', name: 'Neon red' },
      { id: 'darkneonyellow', name: 'Neon yellow' },
      { id: 'darkneonpink', name: 'Neon pink' },
      { id: 'darkneonorange', name: 'Neon orange' },
    ],
  },
]

export default function Account() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [wpm, setWpm] = useState(() => parseInt(localStorage.getItem('wpm') || '250'))
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [privacyLoaded, setPrivacyLoaded] = useState(false)
  const [stats, setStats] = useState(null)

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || document.documentElement.dataset.theme || 'basic'
    } catch {
      return document.documentElement.dataset.theme || 'basic'
    }
  })

  const [themeOpen, setThemeOpen] = useState(false)
  const themePopoverRef = useRef(null)

  const [font, setFont] = useState(() => {
    try { return localStorage.getItem('font') || 'inter' } catch { return 'inter' }
  })
  const [fontOpen, setFontOpen] = useState(false)
  const fontPopoverRef = useRef(null)
  const fontFileRef = useRef(null)

  const [customFonts, setCustomFonts] = useState([])
  const [fontUploading, setFontUploading] = useState(false)
  const [purchasedThemeIds, setPurchasedThemeIds] = useState(new Set())
  const [storeFonts, setStoreFonts] = useState([])

  const allFonts = [...FONTS, ...customFonts, ...storeFonts]

  const [goal, setGoal] = useState(() => {
    try { return JSON.parse(localStorage.getItem('readingGoal') || 'null') } catch { return null }
  })

  const [badgeQueue, setBadgeQueue] = useState([])
  const [followSheet, setFollowSheet] = useState(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [confirmAvatarRemove, setConfirmAvatarRemove] = useState(false)
  const avatarFileRef = useRef(null)
  const [bioEditing, setBioEditing] = useState(false)
  const [bioValue, setBioValue] = useState('')
  const [bioSaving, setBioSaving] = useState(false)

  useEffect(() => {
    api.get('/me').then(r => {
      setIsPrivate(!!r.data.isPrivate)
      setPrivacyLoaded(true)

      const patch = {}
      if (r.data.font  !== font)  patch.font  = font
      if (r.data.theme !== theme) patch.theme = theme
      if (Object.keys(patch).length > 0) {
        api.patch('/me/preferences', patch).catch(() => {})
      }
    }).catch(() => setPrivacyLoaded(true))
    api.get('/me/stats').then(r => setStats(r.data)).catch(() => {})
    api.get('/store/purchases').then(r => {
      const purchases = Array.isArray(r.data) ? r.data : []
      setPurchasedThemeIds(new Set(
        purchases.filter(p => p.itemType === 'theme').map(p => p.itemId)
      ))
    }).catch(() => {})
    api.get('/store/fonts').then(r => {
      const list = Array.isArray(r.data) ? r.data : []
      setStoreFonts(
        list
          .filter(f => f.purchased)
          .map(f => ({ id: `store-${f.id}`, name: f.displayName, value: `'store-${f.id}'` }))
      )
    }).catch(() => {})
  }, [])

  async function togglePrivacy() {
    const next = !isPrivate
    setIsPrivate(next)
    try {
      await api.patch('/me/privacy', { isPrivate: next })
    } catch {
      setIsPrivate(!next)
    }
  }

  async function registerCustomFont(apiFont) {
    const styleId = `custom-font-face-${apiFont.id}`
    if (document.getElementById(styleId)) return
    try {
      const res = await api.get(`/fonts/${apiFont.id}/file`, { responseType: 'blob' })
      const blobUrl = URL.createObjectURL(res.data)
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `@font-face { font-family: 'custom-${apiFont.id}'; src: url('${blobUrl}'); }`
      document.head.appendChild(style)
    } catch {
      // ignore — font just won't render
    }
  }

  useEffect(() => {
    api.get('/fonts').then(async res => {
      const list = res.data['hydra:member'] ?? res.data
      await Promise.all(list.map(f => registerCustomFont(f)))
      setCustomFonts(list.map(f => ({
        id: `custom-${f.id}`,
        name: f.displayName,
        value: `'custom-${f.id}'`,
        apiId: f.id,
      })))
    }).catch(() => {})
  }, [])

  function handleWpmChange(val) {
    setWpm(val)
    localStorage.setItem('wpm', String(val))
    const newBadges = checkTierBadges('speed_demon', val)
    if (newBadges.length > 0) setBadgeQueue(q => [...q, ...newBadges])
  }

  function handleLogout() {
    if (confirmLogout) {
      logout()
      navigate('/login')
    } else {
      setConfirmLogout(true)
      setTimeout(() => setConfirmLogout(false), 3000)
    }
  }

  function setThemeAndPersist(nextTheme) {
    document.documentElement.classList.remove('theme-alt')
    document.body?.classList.remove('theme-alt')
    document.getElementById('root')?.classList.remove('theme-alt')

    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
    try {
      localStorage.setItem('theme', nextTheme)
      localStorage.removeItem('themeAlt')
    } catch {
      // ignore
    }
    api.patch('/me/preferences', { theme: nextTheme }).catch(() => {})
  }

  function updateGoal(patch) {
    const base = goal || { enabled: true, type: 'words', target: 1000 }
    const next = { ...base, ...patch }
    setGoal(next)
    try { localStorage.setItem('readingGoal', JSON.stringify(next)) } catch {}
  }

  function setFontAndPersist(fontId) {
    const f = allFonts.find(f => f.id === fontId)
    if (!f) return
    document.documentElement.style.setProperty('--c-font-family', f.value)
    setFont(fontId)
    try { localStorage.setItem('font', fontId) } catch {}
    api.patch('/me/preferences', { font: fontId }).catch(() => {})
  }

  async function deleteCustomFont(entry) {
    try {
      await api.delete(`/fonts/${entry.apiId}`)
      setCustomFonts(prev => prev.filter(f => f.id !== entry.id))
      if (font === entry.id) {
        setFontAndPersist('inter')
      }
    } catch {}
  }

  async function handleFontUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFontUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/fonts/upload', form)
      await registerCustomFont(data)
      const entry = { id: `custom-${data.id}`, name: data.displayName, value: `'custom-${data.id}'`, apiId: data.id }
      setCustomFonts(prev => [...prev, entry])
      document.documentElement.style.setProperty('--c-font-family', entry.value)
      setFont(entry.id)
      try { localStorage.setItem('font', entry.id) } catch {}
      setFontOpen(false)
    } catch {
      // silent — could add error state if needed
    } finally {
      setFontUploading(false)
      if (fontFileRef.current) fontFileRef.current.value = ''
    }
  }

  useEffect(() => {
    if (!themeOpen) return

    function onDocPointerDown(e) {
      const el = themePopoverRef.current
      if (!el) return
      if (el.contains(e.target)) return
      setThemeOpen(false)
    }

    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [themeOpen])

  useEffect(() => {
    if (!fontOpen) return

    function onDocPointerDown(e) {
      const el = fontPopoverRef.current
      if (!el) return
      if (el.contains(e.target)) return
      setFontOpen(false)
    }

    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [fontOpen])

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/me/avatar', form)
      updateUser({ avatarUrl: data.avatarUrl ? `${resolveUrl(data.avatarUrl)}?t=${Date.now()}` : null })
    } catch {
      // silent
    } finally {
      setAvatarUploading(false)
      if (avatarFileRef.current) avatarFileRef.current.value = ''
    }
  }

  async function handleAvatarRemove() {
    if (!confirmAvatarRemove) {
      setConfirmAvatarRemove(true)
      setTimeout(() => setConfirmAvatarRemove(false), 3000)
      return
    }
    setConfirmAvatarRemove(false)
    try {
      const { data } = await api.delete('/me/avatar')
      updateUser({ avatarUrl: data.avatarUrl })
    } catch {
      // silent
    }
  }

  function startBioEdit() {
    setBioValue(user?.bio || '')
    setBioEditing(true)
  }

  async function handleBioSave() {
    setBioSaving(true)
    try {
      const { data } = await api.patch('/me/bio', { bio: bioValue })
      updateUser({ bio: data.bio })
      setBioEditing(false)
    } catch {
      // silent
    } finally {
      setBioSaving(false)
    }
  }

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const activeFont = allFonts.find(f => f.id === font)

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="px-6 pt-14 pb-6 flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-neutral-8">Account</h1>
        <button
          onClick={() => navigate('/store')}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-shade-white shadow-card active:opacity-70"
          aria-label="Store"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-6">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="px-6 flex flex-col gap-5">
        {/* Profile card */}
        <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
          <div className="flex items-center gap-4 mb-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <button
                onClick={() => avatarFileRef.current?.click()}
                disabled={avatarUploading}
                className="w-14 h-14 rounded-2xl bg-primary-1 flex items-center justify-center overflow-hidden relative active:opacity-75 disabled:opacity-60"
              >
                {user?.avatarUrl ? (
                  <img
                    src={resolveUrl(user.avatarUrl)}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : avatarUploading ? (
                  <div className="w-5 h-5 border-2 border-shade-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="text-shade-white text-xl font-bold uppercase">
                    {user?.name?.[0] || '?'}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-shade-white">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
              {user?.avatarUrl && (
                <button
                  onClick={handleAvatarRemove}
                  className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center active:opacity-70 transition-colors ${confirmAvatarRemove ? 'bg-error-2' : 'bg-neutral-5'}`}
                  aria-label="Remove photo"
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[17px] font-bold text-neutral-8">{user?.name}</p>
              {joinDate && <p className="text-[12px] text-neutral-4 mt-0.5">Member since {joinDate}</p>}
            </div>
          </div>

          {/* Bio */}
          {bioEditing ? (
            <div className="mt-4">
              <textarea
                value={bioValue}
                onChange={e => setBioValue(e.target.value)}
                maxLength={200}
                rows={3}
                autoFocus
                placeholder="Write something about yourself…"
                className="w-full bg-neutral-1 rounded-2xl px-4 py-3 text-[14px] text-neutral-8 placeholder-neutral-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary-1"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[11px] text-neutral-4">{bioValue.length}/200</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBioEditing(false)}
                    className="px-3 py-1.5 rounded-xl text-[13px] font-semibold text-neutral-5 bg-neutral-1 active:opacity-70"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBioSave}
                    disabled={bioSaving}
                    className="px-3 py-1.5 rounded-xl text-[13px] font-semibold text-shade-white bg-primary-1 active:opacity-80 disabled:opacity-50"
                  >
                    {bioSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={startBioEdit}
              className="mt-4 w-full text-left active:opacity-70"
            >
              {user?.bio ? (
                <p className="text-[13px] text-neutral-6 leading-relaxed">{user.bio}</p>
              ) : (
                <p className="text-[13px] text-neutral-3">Add a bio…</p>
              )}
            </button>
          )}

          <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-neutral-1">
            <div className="text-center">
              <p className="text-[20px] font-bold text-neutral-8">{stats?.booksCount ?? '—'}</p>
              <p className="text-[11px] text-neutral-4 mt-0.5">Books</p>
            </div>
            <button className="text-center active:opacity-60" onClick={() => setFollowSheet('followers')}>
              <p className="text-[20px] font-bold text-neutral-8">{stats?.followersCount ?? '—'}</p>
              <p className="text-[11px] text-neutral-4 mt-0.5">Followers</p>
            </button>
            <button className="text-center active:opacity-60" onClick={() => setFollowSheet('following')}>
              <p className="text-[20px] font-bold text-neutral-8">{stats?.followingCount ?? '—'}</p>
              <p className="text-[11px] text-neutral-4 mt-0.5">Following</p>
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
            <p className="text-[13px] font-bold text-neutral-6 uppercase tracking-wider mb-3">Stats</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-1 rounded-2xl px-4 py-3">
                <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Completed</p>
                <p className="text-[22px] font-bold text-green-500 mt-0.5">{stats.completedCount ?? 0}</p>
              </div>
              <div className="bg-neutral-1 rounded-2xl px-4 py-3">
                <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Goal today</p>
                {(() => {
                  try {
                    const goal = JSON.parse(localStorage.getItem('readingGoal') || 'null')
                    const today = new Date().toISOString().slice(0, 10)
                    const stored = JSON.parse(localStorage.getItem('readingToday') || 'null')
                    const todayData = stored?.date === today ? stored : { words: 0, pages: 0 }
                    if (!goal?.enabled) return <p className="text-[14px] font-bold text-neutral-4 mt-0.5">No goal</p>
                    const current = goal.type === 'words' ? todayData.words : todayData.pages
                    const hit = current >= goal.target
                    return (
                      <>
                        <p className={`text-[22px] font-bold mt-0.5 ${hit ? 'text-green-500' : 'text-neutral-8'}`}>
                          {hit ? '✓' : `${Math.round((current / goal.target) * 100)}%`}
                        </p>
                        {!hit && <p className="text-[10px] text-neutral-4 mt-0.5">{current.toLocaleString()} / {goal.target.toLocaleString()} {goal.type}</p>}
                      </>
                    )
                  } catch { return <p className="text-[14px] font-bold text-neutral-4 mt-0.5">—</p> }
                })()}
              </div>
              <div className="bg-neutral-1 rounded-2xl px-4 py-3">
                <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Font</p>
                <p className="text-[14px] font-bold text-neutral-8 mt-0.5">{FONT_NAMES[font] ?? font}</p>
              </div>
              <div className="bg-neutral-1 rounded-2xl px-4 py-3">
                <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Theme</p>
                <p className="text-[14px] font-bold text-neutral-8 mt-0.5 capitalize">{THEME_NAMES[theme] ?? theme}</p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy */}
        <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-bold text-neutral-6 uppercase tracking-wider">Private profile</p>
              <p className="text-[13px] text-neutral-5 mt-1">Hide books &amp; badges from non-followers</p>
            </div>
            <button
              type="button"
              onClick={togglePrivacy}
              disabled={!privacyLoaded}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 disabled:opacity-50 ${isPrivate ? 'bg-primary-1' : 'bg-neutral-3'}`}
              aria-pressed={isPrivate}
            >
              <span className={`absolute top-1 w-5 h-5 bg-shade-white rounded-full shadow transition-all duration-200 ${isPrivate ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg" ref={themePopoverRef}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-bold text-neutral-6 uppercase tracking-wider">Theme</p>
              <p className="text-[13px] text-neutral-5 mt-1">Pick a color palette</p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeOpen(o => !o)}
                className="h-11 px-3 rounded-2xl border border-neutral-2 bg-neutral-1/0 hover:bg-neutral-1 transition-colors flex items-center gap-2"
                aria-haspopup="menu"
                aria-expanded={themeOpen}
              >
                <span className="flex items-center gap-1" aria-hidden>
                  <span className="w-3.5 h-3.5 rounded-md border border-neutral-3" style={{ backgroundColor: `rgb(var(--theme-${theme}-neutral-1))` }} />
                  <span className="w-3.5 h-3.5 rounded-md border border-neutral-3" style={{ backgroundColor: `rgb(var(--theme-${theme}-neutral-3))` }} />
                  <span className="w-3.5 h-3.5 rounded-md border border-neutral-3" style={{ backgroundColor: `rgb(var(--theme-${theme}-neutral-5))` }} />
                  <span className="w-3.5 h-3.5 rounded-md border border-neutral-3" style={{ backgroundColor: `rgb(var(--theme-${theme}-primary-1))` }} />
                  <span className="w-3.5 h-3.5 rounded-md border border-neutral-3" style={{ backgroundColor: `rgb(var(--theme-${theme}-error-2))` }} />
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-5" aria-hidden>
                  <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="sr-only">Choose theme</span>
              </button>

              {themeOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 rounded-2xl border border-neutral-2 bg-shade-white shadow-card-lg p-3 z-50"
                >
                  <div className="flex flex-col gap-4">
                    {/* Free themes */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-4 mb-2 px-0.5">Free</p>
                      <div className="flex flex-col gap-2">
                        {[
                          { label: 'Light', themes: THEME_GROUPS[0].themes },
                          { label: 'Dark',  themes: THEME_GROUPS[1].themes },
                        ].map(group => (
                          <div key={group.label}>
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-3 mb-1.5 px-0.5">{group.label}</p>
                            <div className="grid grid-cols-3 gap-2">
                              {group.themes.map(t => {
                                const selected = theme === t.id
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={selected}
                                    onClick={() => { setThemeAndPersist(t.id); setThemeOpen(false) }}
                                    className={`relative h-12 rounded-xl border transition-colors ${selected ? 'border-primary-1' : 'border-neutral-2 hover:border-neutral-3'}`}
                                  >
                                    <span className="absolute inset-2 rounded-lg flex items-center justify-center gap-1" aria-hidden>
                                      {['neutral-1','neutral-3','neutral-5','primary-1','error-2'].map(tok => (
                                        <span key={tok} className="w-3 h-6 rounded-md" style={{ backgroundColor: `rgb(var(--theme-${t.id}-${tok}))` }} />
                                      ))}
                                    </span>
                                    {selected && (
                                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-1 grid place-items-center border-2 border-shade-white" aria-hidden>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-shade-white">
                                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      </span>
                                    )}
                                    <span className="sr-only">{t.name}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Premium themes */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-4 mb-2 px-0.5">Premium</p>
                      {(() => {
                        const premLight = PREMIUM_THEMES.filter(t => t.type === 'light' && purchasedThemeIds.has(t.id))
                        const premDark  = PREMIUM_THEMES.filter(t => t.type === 'dark'  && purchasedThemeIds.has(t.id))
                        if (premLight.length === 0 && premDark.length === 0) {
                          return (
                            <button
                              onClick={() => { setThemeOpen(false); navigate('/store') }}
                              className="w-full text-left px-3 py-2 rounded-xl bg-neutral-1 text-[12px] font-semibold text-primary-1 active:opacity-70"
                            >
                              Browse premium themes →
                            </button>
                          )
                        }
                        return (
                          <div className="flex flex-col gap-2">
                            {[
                              { label: 'Light', themes: premLight },
                              { label: 'Dark',  themes: premDark  },
                            ].filter(g => g.themes.length > 0).map(group => (
                              <div key={group.label}>
                                <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-3 mb-1.5 px-0.5">{group.label}</p>
                                <div className="grid grid-cols-3 gap-2">
                                  {group.themes.map(t => {
                                    const selected = theme === t.id
                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        role="menuitemradio"
                                        aria-checked={selected}
                                        onClick={() => { setThemeAndPersist(t.id); setThemeOpen(false) }}
                                        className={`relative h-12 rounded-xl border transition-colors ${selected ? 'border-primary-1' : 'border-neutral-2 hover:border-neutral-3'}`}
                                      >
                                        <span className="absolute inset-2 rounded-lg flex items-center justify-center gap-1" aria-hidden>
                                          {['neutral-1','neutral-3','neutral-5','primary-1','error-2'].map(tok => (
                                            <span key={tok} className="w-3 h-6 rounded-md" style={{ backgroundColor: `rgb(var(--theme-${t.id}-${tok}))` }} />
                                          ))}
                                        </span>
                                        {selected && (
                                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-1 grid place-items-center border-2 border-shade-white" aria-hidden>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-shade-white">
                                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                          </span>
                                        )}
                                        <span className="sr-only">{t.name}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Font */}
        <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg" ref={fontPopoverRef}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-bold text-neutral-6 uppercase tracking-wider">Font</p>
              <p className="text-[13px] text-neutral-5 mt-1">Choose a typeface</p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setFontOpen(o => !o)}
                className="h-11 px-3 rounded-2xl border border-neutral-2 bg-neutral-1/0 hover:bg-neutral-1 transition-colors flex items-center gap-2"
                aria-haspopup="menu"
                aria-expanded={fontOpen}
              >
                <span className="text-[13px] font-medium text-neutral-7" style={{ fontFamily: activeFont?.value }}>
                  {activeFont?.name ?? 'Inter'}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-5 shrink-0" aria-hidden>
                  <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {fontOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 rounded-2xl border border-neutral-2 bg-shade-white shadow-card-lg p-2 z-50"
                >
                  <div className="max-h-[260px] overflow-y-auto">
                    {FONTS.map(f => {
                      const selected = font === f.id
                      return (
                        <button
                          key={f.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={selected}
                          onClick={() => { setFontAndPersist(f.id); setFontOpen(false) }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${selected ? 'bg-neutral-1' : 'hover:bg-neutral-1'}`}
                        >
                          <span className="text-[14px] text-neutral-8" style={{ fontFamily: f.value }}>{f.name}</span>
                          {selected && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary-1 shrink-0" aria-hidden>
                              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      )
                    })}

                    {customFonts.length > 0 && (
                      <>
                        <div className="mx-3 my-1.5 border-t border-neutral-2" />
                        <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-4">My fonts</p>
                        {customFonts.map(f => {
                          const selected = font === f.id
                          return (
                            <div key={f.id} className={`flex items-center rounded-xl transition-colors ${selected ? 'bg-neutral-1' : 'hover:bg-neutral-1'}`}>
                              <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={selected}
                                onClick={() => { setFontAndPersist(f.id); setFontOpen(false) }}
                                className="flex-1 flex items-center justify-between px-3 py-2.5"
                              >
                                <span className="text-[14px] text-neutral-8" style={{ fontFamily: f.value }}>{f.name}</span>
                                {selected && (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary-1 shrink-0" aria-hidden>
                                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCustomFont(f)}
                                className="p-2 mr-1 rounded-lg text-neutral-4 hover:text-error-2 hover:bg-error-1/10 transition-colors shrink-0"
                                aria-label={`Delete ${f.name}`}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          )
                        })}
                      </>
                    )}

                    {storeFonts.length > 0 && (
                      <>
                        <div className="mx-3 my-1.5 border-t border-neutral-2" />
                        <p className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-4">Purchased</p>
                        {storeFonts.map(f => {
                          const selected = font === f.id
                          return (
                            <button
                              key={f.id}
                              type="button"
                              role="menuitemradio"
                              aria-checked={selected}
                              onClick={() => { setFontAndPersist(f.id); setFontOpen(false) }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${selected ? 'bg-neutral-1' : 'hover:bg-neutral-1'}`}
                            >
                              <span className="text-[14px] text-neutral-8" style={{ fontFamily: f.value }}>{f.name}</span>
                              {selected && (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary-1 shrink-0" aria-hidden>
                                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                          )
                        })}
                      </>
                    )}
                  </div>

                  <div className="mx-3 my-1.5 border-t border-neutral-2" />

                  <button
                    type="button"
                    disabled={fontUploading}
                    onClick={() => fontFileRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors hover:bg-neutral-1 disabled:opacity-50"
                  >
                    {fontUploading ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-5 shrink-0 animate-spin" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-5 shrink-0" aria-hidden>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    <span className="text-[14px] text-neutral-6">
                      {fontUploading ? 'Uploading…' : 'Upload font'}
                    </span>
                  </button>

                  <input
                    ref={fontFileRef}
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    className="hidden"
                    onChange={handleFontUpload}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Daily reading goal */}
        <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
          <div className="flex items-center justify-between gap-4 mb-1">
            <div>
              <p className="text-[13px] font-bold text-neutral-6 uppercase tracking-wider">Daily goal</p>
              <p className="text-[13px] text-neutral-5 mt-1">Set a reading target</p>
            </div>
            <button
              type="button"
              onClick={() => updateGoal({ enabled: !goal?.enabled })}
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors duration-200 ${goal?.enabled ? 'bg-primary-1' : 'bg-neutral-3'}`}
              aria-pressed={!!goal?.enabled}
            >
              <span className={`absolute top-1 w-5 h-5 bg-shade-white rounded-full shadow transition-all duration-200 ${goal?.enabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {goal?.enabled && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => updateGoal({ type: 'words', target: 1000 })}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-colors ${goal.type === 'words' ? 'bg-primary-1 text-shade-white' : 'bg-neutral-1 text-neutral-6'}`}
                >
                  Words
                </button>
                <button
                  onClick={() => updateGoal({ type: 'pages', target: 10 })}
                  className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-colors ${goal.type === 'pages' ? 'bg-primary-1 text-shade-white' : 'bg-neutral-1 text-neutral-6'}`}
                >
                  Pages
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(goal.type === 'words' ? [500, 1000, 2000, 5000] : [5, 10, 20, 50]).map(opt => (
                  <button
                    key={opt}
                    onClick={() => updateGoal({ target: opt })}
                    className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-colors ${
                      goal.target === opt
                        ? 'bg-primary-1 text-shade-white'
                        : 'bg-neutral-1 text-neutral-6'
                    }`}
                  >
                    {opt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reading speed */}
        <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
          <p className="text-[13px] font-bold text-neutral-6 uppercase tracking-wider mb-1">Reading speed</p>
          <p className="text-[26px] font-bold text-neutral-8">{wpm} <span className="text-[14px] font-medium text-neutral-4">WPM</span></p>

          <div className="mt-4">
            <input
              type="range"
              min="100"
              max="800"
              step="50"
              value={wpm}
              onChange={e => handleWpmChange(parseInt(e.target.value))}
              className="w-full accent-primary-1"
            />
            <div className="flex justify-between text-[11px] text-neutral-4 mt-1">
              <span>100</span>
              <span>450</span>
              <span>800</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {WPM_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => handleWpmChange(opt)}
                className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-colors ${
                  wpm === opt
                    ? 'bg-primary-1 text-shade-white'
                    : 'bg-neutral-1 text-neutral-6'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Badges */}
        <BadgesSection />

        {/* About */}
        <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
          <p className="text-[13px] font-bold text-neutral-6 uppercase tracking-wider mb-3">About RSVP</p>
          <p className="text-[13px] text-neutral-5 leading-relaxed">
            Rapid Serial Visual Presentation shows words one at a time with the focus point highlighted, reducing eye movement and increasing reading speed.
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`rounded-2xl py-4 font-semibold text-[15px] transition-colors ${
            confirmLogout
              ? 'bg-error-2 text-shade-white'
              : 'bg-shade-white text-error-2'
          }`}
        >
          {confirmLogout ? 'Tap again to confirm' : 'Sign out'}
        </button>
      </div>

      {badgeQueue.length > 0 && (
        <BadgeToast badgeId={badgeQueue[0]} onDismiss={() => setBadgeQueue(q => q.slice(1))} />
      )}

      {followSheet && (
        <FollowListSheet type={followSheet} onClose={() => setFollowSheet(null)} />
      )}

      <BottomNav />
    </div>
  )
}
