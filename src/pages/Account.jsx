import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'

const WPM_OPTIONS = [100, 150, 200, 250, 300, 350, 400, 500, 600]

const THEMES = [
  { id: 'basic', name: 'Basic' },
  { id: 'pink', name: 'Pink' },
  { id: 'purple', name: 'Purple' },
  { id: 'mint', name: 'Mint green' },
  { id: 'turquoise', name: 'Turquoise' },
  { id: 'bw', name: 'Black & white' },
]

export default function Account() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [wpm, setWpm] = useState(() => parseInt(localStorage.getItem('wpm') || '250'))
  const [confirmLogout, setConfirmLogout] = useState(false)

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || document.documentElement.dataset.theme || 'basic'
    } catch {
      return document.documentElement.dataset.theme || 'basic'
    }
  })

  const [themeOpen, setThemeOpen] = useState(false)
  const themePopoverRef = useRef(null)

  function handleWpmChange(val) {
    setWpm(val)
    localStorage.setItem('wpm', String(val))
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
    // Back-compat cleanup: older builds used a class toggle.
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

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="px-6 pt-14 pb-6">
        <h1 className="text-[26px] font-bold text-neutral-8">Account</h1>
      </div>

      <div className="px-6 flex flex-col gap-5">
        {/* Profile card */}
        <div className="bg-shade-white rounded-3xl p-5 flex items-center gap-4 shadow-card-lg">
          <div className="w-14 h-14 rounded-2xl bg-primary-1 flex items-center justify-center shrink-0">
            <span className="text-shade-white text-xl font-bold uppercase">
              {user?.name?.[0] || '?'}
            </span>
          </div>
          <div>
            <p className="text-[17px] font-bold text-neutral-8">{user?.name}</p>
            {joinDate && <p className="text-[12px] text-neutral-4 mt-0.5">Member since {joinDate}</p>}
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
                  className="absolute right-0 mt-2 w-52 rounded-2xl border border-neutral-2 bg-shade-white shadow-card-lg p-3 z-50"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map(t => {
                      const selected = theme === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          role="menuitemradio"
                          aria-checked={selected}
                          onClick={() => {
                            setThemeAndPersist(t.id)
                            setThemeOpen(false)
                          }}
                          className={`relative h-12 rounded-xl border transition-colors ${selected ? 'border-primary-1' : 'border-neutral-2 hover:border-neutral-3'}`}
                        >
                          <span className="absolute inset-2 rounded-lg flex items-center justify-center gap-1" aria-hidden>
                            <span className="w-3 h-6 rounded-md" style={{ backgroundColor: `rgb(var(--theme-${t.id}-neutral-1))` }} />
                            <span className="w-3 h-6 rounded-md" style={{ backgroundColor: `rgb(var(--theme-${t.id}-neutral-3))` }} />
                            <span className="w-3 h-6 rounded-md" style={{ backgroundColor: `rgb(var(--theme-${t.id}-neutral-5))` }} />
                            <span className="w-3 h-6 rounded-md" style={{ backgroundColor: `rgb(var(--theme-${t.id}-primary-1))` }} />
                            <span className="w-3 h-6 rounded-md" style={{ backgroundColor: `rgb(var(--theme-${t.id}-error-2))` }} />
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
              )}
            </div>
          </div>
        </div>

        {/* Reading speed */}
        <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
          <p className="text-[13px] font-bold text-neutral-6 uppercase tracking-wider mb-1">Reading speed</p>
          <p className="text-[32px] font-bold text-neutral-8">{wpm} <span className="text-[16px] font-medium text-neutral-4">WPM</span></p>

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

      <BottomNav />
    </div>
  )
}
