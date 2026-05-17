import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../lib/api'
import BottomNav from '../components/BottomNav'
import { useBookCover } from '../hooks/useBookCover'
import { checkTierBadges } from '../lib/badges'
import BadgeToast from '../components/BadgeToast'
import NotificationSheet from '../components/NotificationSheet'

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

// Approximate percent complete. We don't have per-page word counts here, so we
// use the same 300-words-per-page assumption used elsewhere in the UI.
function calcProgressPct(book, progress) {
  if (!book || !progress || progress.id == null) return 0

  const totalPages = Math.max(1, Number(book.totalPages || 1))
  const pageNumber = Number(progress.pageNumber || 1)
  const wordIndex = Number(progress.wordIndex || 0)

  // If we're on (or past) the final page, treat as complete.
  // We don't know the exact word count of that page in this view.
  if (pageNumber >= totalPages) return 100

  const withinPage = clamp(wordIndex / 300, 0, 1)
  const pagesDone = Math.max(0, pageNumber - 1) + withinPage
  return clamp((pagesDone / totalPages) * 100, 0, 100)
}

function isCompleted(book, progress) {
  return !!book && !!progress && progress.id != null && Number(progress.pageNumber || 0) >= Number(book.totalPages || 0)
}

function formatPct(pct) {
  if (pct <= 0) return '0%'
  if (pct >= 100) return '100%'
  // Avoid showing "0%" when there is real progress.
  if (pct < 1) return `${pct.toFixed(1)}%`
  return `${Math.round(pct)}%`
}

function BookInfoSheet({ book, progress, onClose, onDelete, onRead }) {
  const { url: coverUrl, status: coverStatus, genre, year } = useBookCover(book.title, book.author, book.format === 'epub')
  const [coverError, setCoverError] = useState(false)
  const [coverImgLoaded, setCoverImgLoaded] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  const wpm = parseInt(localStorage.getItem('wpm') || '250')
  const started = progress?.id != null
  const pct = calcProgressPct(book, progress)
  const completed = isCompleted(book, progress)
  const totalWords = book.totalWords ?? 0
  const uploadDate = new Date(book.uploadedAt).toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
  const remainingWords = (book.totalPages - (progress?.pageNumber ?? 0)) * 300
  const minutesLeft = Math.round(remainingWords / wpm)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragging = useRef(false)
  const startY = useRef(0)

  useEffect(() => {
    setCoverError(false)
    setCoverImgLoaded(false)
  }, [coverUrl])

  const isEpub = book.format === 'epub'
  const showCoverSpinner = isEpub && !coverError && !coverImgLoaded && (coverStatus === 'loading' || coverStatus === 'success')

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

  function handleDelete() {
    if (confirmDelete) {
      onDelete(book.id)
      onClose()
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 2500)
    }
  }

  const backdropOpacity = Math.max(0, 0.4 - dragY / 300)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[55]"
        style={{ backgroundColor: `rgba(0,0,0,${backdropOpacity})` }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 w-full max-w-[430px] bg-shade-white rounded-t-3xl z-[60]"
        style={{
          maxHeight: '85dvh',
          left: '50%',
          transform: `translateX(-50%) translateY(${dragY}px)`,
          transition: dragging.current ? 'none' : 'transform 0.25s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-3" />
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-6 pt-2 pb-10" style={{ maxHeight: 'calc(85dvh - 28px)' }}>
          {/* Cover image */}
          {isEpub && (
            <div className="flex justify-center mb-5">
              <div className="relative rounded-2xl shadow-card-lg overflow-hidden bg-neutral-1" style={{ width: 110, height: 165 }}>
                {coverUrl && !coverError ? (
                  <img
                    src={coverUrl}
                    alt={book.title}
                    onLoad={() => setCoverImgLoaded(true)}
                    onError={() => setCoverError(true)}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  // Leave empty; spinner/fallback will show.
                  <div className="w-full h-full" />
                )}

                {showCoverSpinner && (
                  <div className="absolute inset-0 grid place-items-center" aria-hidden>
                    <div className="w-6 h-6 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!showCoverSpinner && (coverError || coverStatus === 'not_found' || coverStatus === 'error') && (
                  <div className="absolute inset-0 grid place-items-center" aria-hidden>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-neutral-5">
                      <path d="M4 19V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Format badge */}
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary-1 bg-neutral-2 px-2.5 py-1 rounded-full">
            {book.format}
          </span>

          {/* Title */}
          <h2 className="text-[18px] font-bold text-neutral-8 mt-3 leading-snug">
            {book.title}
          </h2>

          {/* Author */}
          {book.author && (
            <p className="text-[14px] text-neutral-5 mt-1">{book.author}</p>
          )}

          {/* Original filename */}
          <p className="text-[12px] text-neutral-4 mt-1 break-all">{book.originalFilename}</p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-neutral-1 rounded-2xl px-4 py-3">
              <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Pages</p>
              <p className="text-[18px] font-bold text-neutral-8 mt-0.5">{book.totalPages}</p>
            </div>
            <div className="bg-neutral-1 rounded-2xl px-4 py-3">
              <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Words</p>
              <p className="text-[18px] font-bold text-neutral-8 mt-0.5">
                {totalWords >= 1000 ? `${Math.round(totalWords / 1000)}k` : totalWords}
              </p>
            </div>
            <div className="bg-neutral-1 rounded-2xl px-4 py-3">
              <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Progress</p>
              <p className={`text-[18px] font-bold mt-0.5 ${completed ? 'text-green-500' : 'text-neutral-8'}`}>
                {completed ? '✓ Done' : formatPct(pct)}
              </p>
              {!completed && started && (
                <div className="mt-2 h-1.5 rounded-full bg-neutral-2 overflow-hidden" aria-hidden>
                  <div className="h-full bg-primary-1 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
            <div className="bg-neutral-1 rounded-2xl px-4 py-3">
              <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Time left</p>
              <p className="text-[18px] font-bold text-neutral-8 mt-0.5">
                {completed ? '—' : `${minutesLeft}m`}
              </p>
            </div>
            {year && (
              <div className="bg-neutral-1 rounded-2xl px-4 py-3">
                <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Published</p>
                <p className="text-[18px] font-bold text-neutral-8 mt-0.5">{year}</p>
              </div>
            )}
            {genre && (
              <div className={`bg-neutral-1 rounded-2xl px-4 py-3 ${year ? '' : 'col-span-1'}`}>
                <p className="text-[11px] text-neutral-5 uppercase tracking-wider font-semibold">Genre</p>
                <p className="text-[15px] font-bold text-neutral-8 mt-0.5 leading-snug">{genre}</p>
              </div>
            )}
          </div>

          {/* Uploaded */}
          <p className="text-[12px] text-neutral-4 mt-4">Uploaded {uploadDate}</p>

          {/* Actions */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleDelete}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 active:opacity-70 transition-colors ${confirmDelete ? 'bg-error-2' : 'bg-error-1'}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={confirmDelete ? 'text-shade-white' : 'text-error-2'}>
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                  stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 11v5M14 11v5"
                  stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
            <button
              onClick={() => { onRead(book.id); onClose() }}
              className="flex-1 bg-primary-1 text-shade-white font-semibold text-[15px] rounded-2xl py-3 active:opacity-80"
            >
              {completed ? 'Read again' : started ? 'Continue reading' : 'Start reading'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function BookItem({ book, progress, onClick, onInfo }) {
  const wpm = parseInt(localStorage.getItem('wpm') || '250')
  const started = progress?.id != null
  const pct = calcProgressPct(book, progress)
  const completed = isCompleted(book, progress)
  const { url: coverUrl, status: coverStatus } = useBookCover(book.title, book.author, book.format === 'epub')
  const [coverError, setCoverError] = useState(false)
  const [coverImgLoaded, setCoverImgLoaded] = useState(false)

  useEffect(() => {
    setCoverError(false)
    setCoverImgLoaded(false)
  }, [coverUrl])

  const isEpub = book.format === 'epub'
  const showCoverSpinner = isEpub && !coverError && !coverImgLoaded && (coverStatus === 'loading' || coverStatus === 'success')

  const remainingPages = book.totalPages - (progress?.pageNumber ?? 0)
  const minutes = Math.round((remainingPages * 300) / wpm)

  return (
    <div className="w-full flex items-center gap-2 bg-shade-white rounded-2xl px-4 py-3.5 shadow-card">
      <button
        onClick={() => onClick(book.id)}
        className="flex items-center gap-3 flex-1 min-w-0 active:opacity-75 transition-opacity"
      >
        <div className="w-11 h-11 rounded-xl bg-neutral-1 flex items-center justify-center shrink-0 overflow-hidden relative">
          {coverUrl && !coverError ? (
            <img
              src={coverUrl}
              alt={book.title}
              onLoad={() => setCoverImgLoaded(true)}
              onError={() => setCoverError(true)}
              className="w-full h-full object-cover"
            />
          ) : null}

          {showCoverSpinner ? (
            <div className="absolute inset-0 grid place-items-center" aria-hidden>
              <div className="w-4 h-4 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            (!coverUrl || coverError || coverStatus === 'not_found' || coverStatus === 'error') && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-neutral-5">
                <path d="M4 19V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                  stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            )
          )}
        </div>
        <div className="flex-1 text-left overflow-hidden">
          <p className="text-[14px] font-medium text-neutral-8 truncate">{book.title}</p>
          {completed ? (
            <p className="text-[12px] font-medium mt-0.5 text-green-500">Completed</p>
          ) : (
            <div className="mt-0.5">
              <p className="text-[12px] text-neutral-4">
                {started ? `${formatPct(pct)} · ${minutes} min to go` : 'Not started'}
              </p>
              {started && (
                <div className="mt-1.5 h-1.5 rounded-full bg-neutral-2 overflow-hidden" aria-hidden>
                  <div className="h-full bg-primary-1 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          )}
        </div>
      </button>

      {/* Three dots */}
      <button
        onClick={e => { e.stopPropagation(); onInfo(book) }}
        className="p-2 shrink-0 active:opacity-60"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
          <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
        </svg>
      </button>
    </div>
  )
}

// Module-level cache — survives re-renders and back-navigation
const cache = { books: null, progressMap: null, lastRead: null }

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()

  const [books, setBooks] = useState(() => cache.books ?? [])
  const [progressMap, setProgressMap] = useState(() => cache.progressMap ?? {})
  const [lastRead, setLastRead] = useState(() => cache.lastRead ?? null)
  // Only show the skeleton on the very first load (cache is empty)
  const [loading, setLoading] = useState(() => cache.books === null)
  const [infoBook, setInfoBook] = useState(null)
  const [badgeQueue, setBadgeQueue] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [tab, setTab] = useState('reading')

  useEffect(() => {
    api.get('/notifications')
      .then(r => setNotifCount(Array.isArray(r.data) ? r.data.length : 0))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    const cold = cache.books === null
    if (cold) setLoading(true)

    try {
      const { data: bookList } = await api.get('/books')

      if (bookList.length === 0) {
        cache.books = bookList
        cache.progressMap = {}
        cache.lastRead = null
        setBooks(bookList)
        setProgressMap({})
        setLastRead(null)
        setLoading(false)
        return
      }

      const results = await Promise.allSettled(
        bookList.map(b => api.get(`/progress/${b.id}`))
      )

      const map = {}
      let mostRecent = null

      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return
        const p = r.value.data
        map[bookList[i].id] = p
        if (p.id != null) {
          if (!mostRecent || new Date(p.updatedAt) > new Date(mostRecent.updatedAt)) {
            mostRecent = { ...p, book: { ...p.book, ...bookList[i] } }
          }
        }
      })

      cache.books = bookList
      cache.progressMap = map
      cache.lastRead = mostRecent

      setBooks(bookList)
      setProgressMap(map)
      setLastRead(mostRecent)

      const collectorBadges = checkTierBadges('collector', bookList.length)
      if (collectorBadges.length > 0) setBadgeQueue(q => [...q, ...collectorBadges])
    } catch {}

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [location.key, load])

  async function handleDelete(bookId) {
    try {
      await api.delete(`/books/${bookId}`)
      const nextBooks = books.filter(b => b.id !== bookId)
      const nextMap = { ...progressMap }
      delete nextMap[bookId]
      const nextLastRead = lastRead?.book?.id === bookId ? null : lastRead

      cache.books = nextBooks
      cache.progressMap = nextMap
      cache.lastRead = nextLastRead

      setBooks(nextBooks)
      setProgressMap(nextMap)
      setLastRead(nextLastRead)
    } catch {
      alert('Could not delete book. Please try again.')
    }
  }

  const goal = (() => {
    try { return JSON.parse(localStorage.getItem('readingGoal') || 'null') } catch { return null }
  })()

  const todayStats = (() => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const stored = JSON.parse(localStorage.getItem('readingToday') || 'null')
      return stored?.date === today ? { words: stored.words || 0, pages: stored.pages || 0 } : { words: 0, pages: 0 }
    } catch { return { words: 0, pages: 0 } }
  })()

  const goalCurrent = goal?.enabled ? (goal.type === 'words' ? todayStats.words : todayStats.pages) : 0
  const goalPct = goal?.enabled ? Math.min(100, Math.round((goalCurrent / goal.target) * 100)) : 0
  const goalDone = goal?.enabled && goalCurrent >= goal.target

  const { reading, planToRead, finished } = useMemo(() => {
    const reading = [], planToRead = [], finished = []
    for (const book of books) {
      const p = progressMap[book.id] ?? null
      if (isCompleted(book, p)) finished.push(book)
      else if (p?.id != null) reading.push(book)
      else planToRead.push(book)
    }
    return { reading, planToRead, finished }
  }, [books, progressMap])

  const wpm = parseInt(localStorage.getItem('wpm') || '250')
  const lastReadPct = lastRead ? calcProgressPct(lastRead.book, lastRead) : 0
  const lastReadCompleted = lastRead ? isCompleted(lastRead.book, lastRead) : false
  const lastReadMinutes = lastRead
    ? Math.round(((lastRead.book.totalPages - lastRead.pageNumber) * 300) / wpm)
    : 0

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      {/* Header */}
      <div className="px-6 pt-14 pb-6 flex items-start justify-between">
        <h1 className="text-[22px] font-bold text-neutral-8 leading-tight">
          Select a file and<br />start{' '}
          <span className="text-primary-1">reading</span>
        </h1>
        <div className="flex items-center gap-2 mt-1 shrink-0">
          <button
            onClick={() => navigate('/upload')}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-shade-white shadow-card active:opacity-70"
            aria-label="Upload"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-6">
              <path d="M12 15V3M12 3l-4 4M12 3l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 17v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-shade-white shadow-card active:opacity-70"
            aria-label="Notifications"
          >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-6">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-error-2 flex items-center justify-center">
              <span className="text-[10px] font-bold text-shade-white">{notifCount > 9 ? '9+' : notifCount}</span>
            </span>
          )}
          </button>
        </div>
      </div>

      <div className="px-6 flex flex-col gap-6">
        {/* Last Read Card */}
        {lastRead && (
          <div className="bg-shade-white rounded-3xl p-5 shadow-card-lg">
            <p className="text-[11px] font-bold text-primary-1 uppercase tracking-widest mb-3">
              Your last read
            </p>
            <p className="text-[16px] font-bold text-neutral-8 leading-snug mb-1">
              {lastRead.book.title}
            </p>
            <p className="text-[13px] text-neutral-4 mb-4">
              {lastReadCompleted ? (
                <span className="text-green-500 font-medium">Completed</span>
              ) : (
                <>
                  {lastReadMinutes > 0 ? `${lastReadMinutes} minutes to go · ` : ''}{formatPct(lastReadPct)}
                </>
              )}
            </p>
            <button
              onClick={() => navigate(`/books/${lastRead.book.id}`)}
              className="bg-primary-1 text-shade-white text-[14px] font-semibold rounded-full px-5 py-2.5 active:opacity-80 transition-opacity"
            >
              Continue reading
            </button>
          </div>
        )}

        {/* Daily goal */}
        {goal?.enabled && (
          <div className={`rounded-3xl p-5 shadow-card-lg ${goalDone ? 'bg-primary-1' : 'bg-shade-white'}`}>
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${goalDone ? 'text-shade-white/70' : 'text-primary-1'}`}>
              Daily goal
            </p>
            {goalDone ? (
              <>
                <p className="text-[16px] font-bold text-shade-white">Goal complete!</p>
                <p className="text-[13px] text-shade-white/80 mt-1">
                  {goalCurrent.toLocaleString()} {goal.type} read today
                </p>
              </>
            ) : (
              <>
                <p className="text-[16px] font-bold text-neutral-8">
                  {goalCurrent.toLocaleString()}{' '}
                  <span className="text-neutral-4 text-[14px] font-medium">
                    / {goal.target.toLocaleString()} {goal.type}
                  </span>
                </p>
                <div className="mt-3 h-2 rounded-full bg-neutral-2 overflow-hidden">
                  <div
                    className="h-full bg-primary-1 rounded-full transition-all"
                    style={{ width: `${goalPct}%` }}
                  />
                </div>
                <p className="text-[12px] text-neutral-4 mt-2">
                  {(goal.target - goalCurrent).toLocaleString()} {goal.type} to go · {goalPct}%
                </p>
              </>
            )}
          </div>
        )}

        {/* Library tabs */}
        <div>
          {/* Tab bar */}
          <div className="flex gap-2 mb-4">
            {[
              { key: 'reading',    label: 'Reading',      count: reading.length },
              { key: 'plan',       label: 'To read', count: planToRead.length },
              { key: 'finished',   label: 'Finished',     count: finished.length },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-semibold transition-colors ${
                  tab === t.key
                    ? 'bg-primary-1 text-shade-white'
                    : 'bg-shade-white text-neutral-5 shadow-card'
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[11px] font-bold rounded-full px-1.5 py-0.5 ${
                    tab === t.key ? 'bg-shade-white/20 text-shade-white' : 'bg-neutral-1 text-neutral-4'
                  }`}>
                    {t.count > 9 ? '9+' : t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-shade-white rounded-2xl h-16 animate-pulse" />
              ))}
            </div>
          ) : (() => {
            const list = tab === 'reading' ? reading : tab === 'plan' ? planToRead : finished
            if (list.length === 0) {
              const empty = {
                reading: 'No books in progress.',
                plan: 'Nothing queued up yet.',
                finished: 'No finished books yet.',
              }[tab]
              return (
                <div className="bg-shade-white rounded-3xl p-6 text-center shadow-card-lg">
                  <p className="text-neutral-4 text-sm mb-1">{empty}</p>
                  {books.length === 0 && (
                    <button onClick={() => navigate('/upload')} className="text-primary-1 text-sm font-semibold">
                      Upload your first file →
                    </button>
                  )}
                </div>
              )
            }
            return (
              <div className="flex flex-col gap-3">
                {list.map(book => (
                  <BookItem
                    key={book.id}
                    book={book}
                    progress={progressMap[book.id] ?? null}
                    onClick={id => navigate(`/books/${id}`)}
                    onInfo={setInfoBook}
                  />
                ))}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Book info bottom sheet */}
      {infoBook && (
        <BookInfoSheet
          book={infoBook}
          progress={progressMap[infoBook.id] ?? null}
          onClose={() => setInfoBook(null)}
          onDelete={handleDelete}
          onRead={id => navigate(`/books/${id}`)}
        />
      )}

      {showNotifications && (
        <NotificationSheet
          onClose={() => setShowNotifications(false)}
          onCountChange={setNotifCount}
        />
      )}

      {badgeQueue.length > 0 && (
        <BadgeToast badgeId={badgeQueue[0]} onDismiss={() => setBadgeQueue(q => q.slice(1))} />
      )}

      <BottomNav />
    </div>
  )
}
