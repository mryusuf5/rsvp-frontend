import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { resolveUrl } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import { useBookCover } from '../hooks/useBookCover'
import BadgesSection from '../components/BadgesSection'
import { addToWishlist, isInWishlist } from '../lib/wishlist'
import { FONT_NAMES, THEME_NAMES, FONT_VALUES } from '../lib/readerSettings'
import { PREMIUM_THEMES } from '../lib/storeItems'

function calcProgressPct(book, progress) {
  if (!book || !progress || progress.id == null) return 0
  const totalPages = Math.max(1, Number(book.totalPages || 1))
  const pageNumber = Number(progress.pageNumber || 1)
  const wordIndex = Number(progress.wordIndex || 0)
  if (pageNumber >= totalPages) return 100
  const withinPage = Math.min(wordIndex / 300, 1)
  return Math.min(((Math.max(0, pageNumber - 1) + withinPage) / totalPages) * 100, 100)
}

function isCompleted(book, progress) {
  return !!book && !!progress && progress.id != null &&
    Number(progress.pageNumber || 0) >= Number(book.totalPages || 0)
}

function formatPct(pct) {
  if (pct <= 0) return '0%'
  if (pct >= 100) return '100%'
  if (pct < 1) return `${pct.toFixed(1)}%`
  return `${Math.round(pct)}%`
}

function BookRow({ book, progress, wishlistProps }) {
  const isEpub = book.format === 'epub'
  const { url: coverUrl, status: coverStatus, genre, year } = useBookCover(book.title, book.author, isEpub)
  const [coverError, setCoverError] = useState(false)
  const [coverImgLoaded, setCoverImgLoaded] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [inWishlist, setInWishlist] = useState(() => isInWishlist(book.title, book.author))

  useEffect(() => {
    setCoverError(false)
    setCoverImgLoaded(false)
  }, [coverUrl])

  const showSpinner = isEpub && !coverError && !coverImgLoaded &&
    (coverStatus === 'loading' || coverStatus === 'success')
  const showFallback = !coverUrl || coverError ||
    coverStatus === 'not_found' || coverStatus === 'error'

  const pct = calcProgressPct(book, progress)
  const completed = isCompleted(book, progress)
  const started = progress?.id != null

  return (
    <div className="bg-shade-white rounded-2xl shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-11 h-11 rounded-xl bg-neutral-1 flex items-center justify-center shrink-0 overflow-hidden relative">
          {coverUrl && !coverError && (
            <img
              src={coverUrl}
              alt={book.title}
              onLoad={() => setCoverImgLoaded(true)}
              onError={() => setCoverError(true)}
              className="w-full h-full object-cover"
            />
          )}
          {showSpinner && (
            <div className="absolute inset-0 grid place-items-center" aria-hidden>
              <div className="w-4 h-4 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!showSpinner && showFallback && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-neutral-5">
              <path d="M4 19V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-neutral-8 truncate">{book.title}</p>
          {book.author && <p className="text-[12px] text-neutral-4 truncate">{book.author}</p>}
          {completed ? (
            <p className="text-[12px] font-medium text-green-500 mt-0.5">Completed</p>
          ) : started ? (
            <div className="mt-1">
              <p className="text-[12px] text-neutral-4">{formatPct(pct)} through</p>
              <div className="mt-1 h-1.5 rounded-full bg-neutral-2 overflow-hidden">
                <div className="h-full bg-primary-1 rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-neutral-4 mt-0.5">Not started</p>
          )}
        </div>

        {wishlistProps && (
          <button
            onClick={() => {
              if (inWishlist) return
              const added = addToWishlist({
                title: book.title,
                author: book.author ?? null,
                format: book.format,
                genre: genre ?? null,
                year: year ?? null,
                fromUserId: wishlistProps.fromUserId,
                fromUserName: wishlistProps.fromUserName,
              })
              if (added) setInWishlist(true)
            }}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-colors active:opacity-70 ${inWishlist ? 'text-primary-1' : 'text-neutral-4 active:bg-neutral-1'}`}
            aria-label={inWishlist ? 'In wishlist' : 'Add to wishlist'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        <button
          onClick={() => setShowDetails(v => !v)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-neutral-4 active:bg-neutral-1 transition-colors"
          aria-label="Book details"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>

      {showDetails && (
        <div className="px-4 pb-4 pt-1 border-t border-neutral-1">
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div className="bg-neutral-1 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[18px] font-bold text-neutral-8">{book.totalPages}</p>
              <p className="text-[10px] text-neutral-4 mt-0.5 uppercase tracking-wide">Pages</p>
            </div>
            <div className="bg-neutral-1 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[18px] font-bold text-neutral-8">{(book.totalWords ?? 0).toLocaleString()}</p>
              <p className="text-[10px] text-neutral-4 mt-0.5 uppercase tracking-wide">Words</p>
            </div>
            <div className="bg-neutral-1 rounded-xl px-3 py-2.5 text-center">
              <p className="text-[18px] font-bold text-neutral-8 uppercase">{book.format}</p>
              <p className="text-[10px] text-neutral-4 mt-0.5 uppercase tracking-wide">Format</p>
            </div>
            {year && (
              <div className="bg-neutral-1 rounded-xl px-3 py-2.5 text-center">
                <p className="text-[18px] font-bold text-neutral-8">{year}</p>
                <p className="text-[10px] text-neutral-4 mt-0.5 uppercase tracking-wide">Published</p>
              </div>
            )}
            {genre && (
              <div className={`bg-neutral-1 rounded-xl px-3 py-2.5 text-center ${year ? 'col-span-2' : 'col-span-3'}`}>
                <p className="text-[14px] font-bold text-neutral-8 leading-snug">{genre}</p>
                <p className="text-[10px] text-neutral-4 mt-0.5 uppercase tracking-wide">Genre</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Profile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: me } = useAuth()

  const [profile, setProfile] = useState(null)
  const [books, setBooks] = useState([])
  const [progressMap, setProgressMap] = useState({})
  const [earnedBadges, setEarnedBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [canView, setCanView] = useState(false)

  const [followStatus, setFollowStatus] = useState(null)
  const [followId, setFollowId] = useState(null)
  const [followActing, setFollowActing] = useState(false)
  const [confirmUnfollow, setConfirmUnfollow] = useState(false)

  const [myPurchasedThemeIds, setMyPurchasedThemeIds] = useState(new Set())
  const [myPurchasedFontIds, setMyPurchasedFontIds] = useState(new Set())

  const isOwnProfile = me && String(me.id) === String(userId)

  useEffect(() => {
    if (!isOwnProfile && me) {
      api.get('/store/purchases').then(res => {
        const list = Array.isArray(res.data) ? res.data : []
        setMyPurchasedThemeIds(new Set(list.filter(p => p.itemType === 'theme').map(p => p.itemId)))
        setMyPurchasedFontIds(new Set(list.filter(p => p.itemType === 'font').map(p => String(p.itemId))))
      }).catch(() => {})
    }

    async function load() {
      try {
        const userRes = await api.get(`/users/${userId}`)
        const p = userRes.data
        setProfile(p)
        setFollowStatus(p.followStatus?.following ?? null)
        setFollowId(p.followStatus?.followId ?? null)

        const viewable = !p.isPrivate || isOwnProfile || p.followStatus?.following === 'accepted'
        setCanView(viewable)

        if (viewable) {
          const [booksRes, badgesRes] = await Promise.all([
            api.get(`/users/${userId}/books`),
            api.get(`/users/${userId}/badges`).catch(() => ({ data: [] })),
          ])

          const bookList = Array.isArray(booksRes.data)
            ? booksRes.data
            : (booksRes.data['hydra:member'] ?? [])
          setBooks(bookList)

          const rawBadges = Array.isArray(badgesRes.data)
            ? badgesRes.data
            : (badgesRes.data['hydra:member'] ?? [])
          setEarnedBadges(rawBadges.map(b => ({ id: b.badgeId ?? b.id, earnedAt: b.earnedAt })))

          const results = await Promise.allSettled(
            bookList.map(b => api.get(`/users/${userId}/progress/${b.id}`))
          )
          const map = {}
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') map[bookList[i].id] = r.value.data
          })
          setProgressMap(map)
        }
      } catch (err) {
        if (err?.response?.status === 404) setNotFound(true)
      }
      setLoading(false)
    }
    load()
  }, [userId, isOwnProfile])

  async function handleFollow() {
    if (followStatus !== null && !confirmUnfollow) {
      setConfirmUnfollow(true)
      setTimeout(() => setConfirmUnfollow(false), 3000)
      return
    }
    setConfirmUnfollow(false)
    setFollowActing(true)
    try {
      if (followStatus === null) {
        const { data } = await api.post(`/follow/${userId}`)
        setFollowStatus(data.status)
        setFollowId(data.followId)
        if (data.status === 'accepted') setCanView(true)
      } else {
        await api.delete(`/follow/${userId}`)
        setFollowStatus(null)
        setFollowId(null)
        if (profile?.isPrivate) setCanView(false)
      }
    } catch {
      // silent
    } finally {
      setFollowActing(false)
    }
  }

  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const lastRead = books.reduce((best, book) => {
    const p = progressMap[book.id]
    if (!p?.id || !p.updatedAt) return best
    if (!best) return book
    return new Date(p.updatedAt) > new Date(progressMap[best.id]?.updatedAt ?? 0) ? book : best
  }, null)

  const booksCompleted = books.filter(b => isCompleted(b, progressMap[b.id])).length
  const booksInProgress = books.filter(b => {
    const p = progressMap[b.id]
    return p?.id != null && !isCompleted(b, p)
  }).length

  const today = new Date().toISOString().slice(0, 10)
  const activeToday = Object.values(progressMap).some(p => p?.updatedAt?.startsWith(today))

  function copySettings() {
    const premiumThemeIds = new Set(PREMIUM_THEMES.map(t => t.id))

    if (profile.font) {
      const isStoreFont = profile.font.startsWith('store-')
      if (isStoreFont) {
        const fontId = profile.font.replace('store-', '')
        if (!myPurchasedFontIds.has(fontId)) {
          navigate('/store')
          return
        }
      }
    }

    if (profile.theme && premiumThemeIds.has(profile.theme)) {
      if (!myPurchasedThemeIds.has(profile.theme)) {
        navigate('/store')
        return
      }
    }

    const patch = {}
    if (profile.font) {
      const cssValue = FONT_VALUES[profile.font] ?? `'${profile.font}'`
      localStorage.setItem('font', profile.font)
      document.documentElement.style.setProperty('--c-font-family', cssValue)
      patch.font = profile.font
    }
    if (profile.theme) {
      localStorage.setItem('theme', profile.theme)
      document.documentElement.classList.remove('theme-alt')
      document.documentElement.dataset.theme = profile.theme
      patch.theme = profile.theme
    }
    if (Object.keys(patch).length > 0) {
      api.patch('/me/preferences', patch).catch(() => {})
    }
  }

  const backBtn = (
    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-4 active:opacity-60">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="text-[13px] font-medium">Back</span>
    </button>
  )

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col min-h-dvh pb-24">
        <div className="px-6 pt-14 pb-6">{backBtn}</div>
        <div className="px-6 text-center py-12">
          <p className="text-neutral-4 text-sm">User not found</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  function FollowButton() {
    if (isOwnProfile) return null
    if (followStatus === 'accepted') {
      return (
        <button
          onClick={handleFollow}
          disabled={followActing}
          className={`px-4 py-2 rounded-xl text-[13px] font-semibold active:opacity-75 disabled:opacity-50 transition-colors ${confirmUnfollow ? 'bg-error-2 text-shade-white' : 'bg-neutral-1 text-neutral-6'}`}
        >
          {confirmUnfollow ? 'Unfollow?' : 'Following'}
        </button>
      )
    }
    if (followStatus === 'pending') {
      return (
        <button
          onClick={handleFollow}
          disabled={followActing}
          className={`px-4 py-2 rounded-xl text-[13px] font-semibold active:opacity-75 disabled:opacity-50 transition-colors ${confirmUnfollow ? 'bg-error-2 text-shade-white' : 'bg-neutral-1 text-neutral-5'}`}
        >
          {confirmUnfollow ? 'Cancel?' : 'Requested'}
        </button>
      )
    }
    return (
      <button
        onClick={handleFollow}
        disabled={followActing}
        className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-primary-1 text-shade-white active:opacity-75 disabled:opacity-50 transition-opacity"
      >
        Follow
      </button>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="px-6 pt-14 pb-4">{backBtn}</div>

      <div className="px-6 flex flex-col gap-5">
        {/* Profile card */}
        <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-1 flex items-center justify-center shrink-0 overflow-hidden">
              {profile.avatarUrl ? (
                <img src={resolveUrl(profile.avatarUrl)} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-shade-white text-2xl font-bold uppercase">
                  {profile.name?.[0] ?? '?'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[18px] font-bold text-neutral-8 truncate">{profile.name}</p>
                {profile.isPrivate && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-neutral-4 shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              {joinDate && <p className="text-[12px] text-neutral-4 mt-0.5">Member since {joinDate}</p>}
            </div>
            <FollowButton />
          </div>
          {profile.bio && (
            <p className="text-[13px] text-neutral-6 mt-3 leading-relaxed">{profile.bio}</p>
          )}
        </div>

        {!canView ? (
          /* Private profile — viewer is not an accepted follower */
          <div className="bg-shade-white rounded-3xl p-8 shadow-card text-center flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-neutral-1 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-neutral-7">Private profile</p>
            <p className="text-[13px] text-neutral-4">
              {followStatus === 'pending'
                ? 'Your follow request is pending approval.'
                : 'Follow this user to see their books and badges.'}
            </p>
          </div>
        ) : (
          <>
            {/* Stats row */}
            {books.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-shade-white rounded-2xl px-3 py-4 text-center shadow-card">
                  <p className="text-[24px] font-bold text-neutral-8">{books.length}</p>
                  <p className="text-[11px] text-neutral-4 mt-0.5">Books</p>
                </div>
                <div className="bg-shade-white rounded-2xl px-3 py-4 text-center shadow-card">
                  <p className="text-[24px] font-bold text-green-500">{booksCompleted}</p>
                  <p className="text-[11px] text-neutral-4 mt-0.5">Done</p>
                </div>
                <div className="bg-shade-white rounded-2xl px-3 py-4 text-center shadow-card">
                  <p className="text-[24px] font-bold text-primary-1">{booksInProgress}</p>
                  <p className="text-[11px] text-neutral-4 mt-0.5">Reading</p>
                </div>
              </div>
            )}

            {/* Reader stats */}
            <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
              <p className="text-[13px] font-bold text-neutral-6 uppercase tracking-wider mb-3">Stats</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-1 rounded-2xl px-4 py-3">
                  <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Completed</p>
                  <p className="text-[22px] font-bold text-green-500 mt-0.5">{booksCompleted}</p>
                </div>
                <div className="bg-neutral-1 rounded-2xl px-4 py-3">
                  <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Read today</p>
                  <p className={`text-[22px] font-bold mt-0.5 ${activeToday ? 'text-green-500' : 'text-neutral-4'}`}>
                    {activeToday ? '✓' : '—'}
                  </p>
                </div>
                {profile.font && (
                  <div className="bg-neutral-1 rounded-2xl px-4 py-3">
                    <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Font</p>
                    <p className="text-[14px] font-bold text-neutral-8 mt-0.5">{FONT_NAMES[profile.font] ?? profile.font}</p>
                  </div>
                )}
                {profile.theme && (
                  <div className="bg-neutral-1 rounded-2xl px-4 py-3">
                    <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Theme</p>
                    <div className="flex gap-1 mt-1.5">
                      {['neutral-1','neutral-3','neutral-5','primary-1','error-2'].map(t => (
                        <span key={t} className="w-4 h-4 rounded-md border border-black/10 shrink-0"
                          style={{ backgroundColor: `rgb(var(--theme-${profile.theme}-${t}))` }} />
                      ))}
                    </div>
                    <p className="text-[11px] text-neutral-5 mt-1">{THEME_NAMES[profile.theme] ?? profile.theme}</p>
                  </div>
                )}
              </div>
              {!isOwnProfile && (profile.font || profile.theme) && (
                <button
                  onClick={copySettings}
                  className="mt-3 w-full py-2.5 rounded-2xl text-[13px] font-semibold bg-neutral-1 text-neutral-6 active:opacity-70 transition-opacity"
                >
                  Copy their settings
                </button>
              )}
            </div>

            {/* Badges */}
            <BadgesSection earnedBadges={earnedBadges} showLocked={true} />

            {/* Currently reading */}
            {lastRead && !isCompleted(lastRead, progressMap[lastRead.id]) && (
              <div>
                <p className="text-[11px] font-bold text-primary-1 uppercase tracking-widest mb-3">
                  Currently reading
                </p>
                <BookRow
                  book={lastRead}
                  progress={progressMap[lastRead.id]}
                  wishlistProps={isOwnProfile ? null : { fromUserId: profile.id, fromUserName: profile.name }}
                />
              </div>
            )}

            {/* Full library */}
            {books.length > 0 ? (
              <div>
                <p className="text-[11px] font-bold text-neutral-5 uppercase tracking-widest mb-3">
                  Library · {books.length} {books.length === 1 ? 'book' : 'books'}
                </p>
                <div className="flex flex-col gap-3">
                  {books.map(book => (
                    <BookRow
                      key={book.id}
                      book={book}
                      progress={progressMap[book.id] ?? null}
                      wishlistProps={isOwnProfile ? null : { fromUserId: profile.id, fromUserName: profile.name }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-4 text-sm">No books in library yet</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
