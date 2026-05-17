import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'
import { checkTierBadges, getReadingStats, updateReadingStats } from '../lib/badges'
import BadgeToast from '../components/BadgeToast'
import { splitWords } from '../lib/readerText'

function WordDisplay({ word }) {
  if (!word) return <span className="text-neutral-6 text-2xl sm:text-4xl font-bold">•••</span>

  // Highlight the fixation point.
  // We ignore '.' and ',' when deciding which letter(s) are the middle.
  // Odd counted letters: highlight the single middle letter.
  // Even counted letters: highlight the two middle letters.
  const letterIdx = []
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]
    if (ch === '.' || ch === ',') continue
    letterIdx.push(i)
  }

  const highlight = new Array(word.length).fill(false)
  if (letterIdx.length > 0) {
    const n = letterIdx.length
    const left = Math.floor((n - 1) / 2)
    const right = Math.ceil((n - 1) / 2)
    highlight[letterIdx[left]] = true
    highlight[letterIdx[right]] = true
  }

  const parts = []
  for (let i = 0; i < word.length;) {
    const isHi = highlight[i]
    let j = i + 1
    while (j < word.length && highlight[j] === isHi) j++
    const text = word.slice(i, j)
    parts.push(
      <span key={`${i}-${j}`} className={isHi ? 'rsvp-reader-accent' : 'text-neutral-8 opacity-90'}>
        {text}
      </span>
    )
    i = j
  }

  return (
    <div className="flex items-baseline justify-center font-bold text-2xl sm:text-4xl tracking-wide select-none">
      {parts}
    </div>
  )
}

export default function Reader() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [book, setBook] = useState(null)
  const [words, setWords] = useState([])
  const [pageContent, setPageContent] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [wordIdx, setWordIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [wpm, setWpm] = useState(() => parseInt(localStorage.getItem('wpm') || '250'))
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [chapterTitle, setChapterTitle] = useState('')
  const [contentStart, setContentStart] = useState(null)
  const [findingContentStart, setFindingContentStart] = useState(false)
  const [badgeQueue, setBadgeQueue] = useState([])

  const [todayStats, setTodayStats] = useState(() => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const stored = JSON.parse(localStorage.getItem('readingToday') || 'null')
      return stored?.date === today ? { words: stored.words || 0, pages: stored.pages || 0 } : { words: 0, pages: 0 }
    } catch { return { words: 0, pages: 0 } }
  })

  // Refs that always hold latest values — used inside setInterval
  const stateRef = useRef({ words: [], wordIdx: 0, currentPage: 1, isPlaying: false, book: null, wpm: 250 })
  const intervalRef = useRef(null)
  const saveTimerRef = useRef(null)
  const loadingNextPageRef = useRef(false)
  const sessionWordsRef = useRef(0)
  const sessionPagesRef = useRef(0)
  const awardAndShowRef = useRef((ids) => {
    if (ids.length > 0) setBadgeQueue(q => [...q, ...ids])
  })

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = { words, wordIdx, currentPage, isPlaying, book, wpm }
  })

  const saveProgress = useCallback((pageNum, wi) => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem('lastReadAt', new Date().toISOString())
      api.put(`/progress/${bookId}`, { pageNumber: pageNum, wordIndex: wi }).catch(() => {})
    }, 600)
  }, [bookId])

  const saveProgressNow = useCallback(async (pageNum, wi) => {
    // Flush any pending debounced save, then save immediately.
    clearTimeout(saveTimerRef.current)
    try {
      await api.put(`/progress/${bookId}`, { pageNumber: pageNum, wordIndex: wi })
    } catch {
      // ignore
    }
  }, [bookId])

  const flushSession = useCallback(() => {
    const w = sessionWordsRef.current
    const p = sessionPagesRef.current
    if (w === 0 && p === 0) return
    sessionWordsRef.current = 0
    sessionPagesRef.current = 0
    try {
      const today = new Date().toISOString().slice(0, 10)
      const stored = JSON.parse(localStorage.getItem('readingToday') || 'null')
      const newWords = (!stored || stored.date !== today) ? w : stored.words + w
      const newPages = (!stored || stored.date !== today) ? p : stored.pages + p
      localStorage.setItem('readingToday', JSON.stringify({ date: today, words: newWords, pages: newPages }))
      setTodayStats({ words: newWords, pages: newPages })

      const stats = getReadingStats()
      const newTotalWords = (stats.totalWords || 0) + w
      const newTotalPages = (stats.totalPages || 0) + p

      // Streak tracking
      let newStreak = stats.readingStreak || 0
      const lastDate = stats.lastReadDate
      if (!lastDate || lastDate !== today) {
        const prev = new Date(today)
        prev.setDate(prev.getDate() - 1)
        newStreak = (lastDate === prev.toISOString().slice(0, 10)) ? newStreak + 1 : 1
      }
      const newLongestStreak = Math.max(stats.longestStreak || 0, newStreak)

      // Daily goal hit count (once per day)
      const goal = (() => { try { return JSON.parse(localStorage.getItem('readingGoal') || 'null') } catch { return null } })()
      let newDailyGoalsHit = stats.dailyGoalsHit || 0
      let hitGoalToday = false
      if (goal?.enabled) {
        const current = goal.type === 'words' ? newWords : newPages
        if (current >= goal.target && stats.dailyGoalLastDate !== today) {
          newDailyGoalsHit++
          hitGoalToday = true
        }
      }

      const statsPatch = {
        totalWords: newTotalWords, totalPages: newTotalPages,
        readingStreak: newStreak, longestStreak: newLongestStreak, lastReadDate: today,
      }
      if (hitGoalToday) {
        statsPatch.dailyGoalsHit = newDailyGoalsHit
        statsPatch.dailyGoalLastDate = today
      }
      updateReadingStats(statsPatch)

      const newBadges = [
        ...checkTierBadges('reader', newTotalWords),
        ...checkTierBadges('page_turner', newTotalPages),
        ...checkTierBadges('dedicated', newLongestStreak),
        ...(hitGoalToday ? checkTierBadges('daily_achiever', newDailyGoalsHit) : []),
      ]
      if (newBadges.length > 0) awardAndShowRef.current(newBadges)
    } catch {}
  }, [])

  const loadPage = useCallback(async (pageNum, startIdx = 0) => {
    setPageLoading(true)
    try {
      const { data } = await api.get(`/books/${bookId}/pages/${pageNum}`)
      setPageContent(data.content || '')
      const w = splitWords(data.content)
      setWords(w)
      stateRef.current.words = w
      setWordIdx(startIdx)
      stateRef.current.wordIdx = startIdx
      setCurrentPage(pageNum)
      stateRef.current.currentPage = pageNum
      setChapterTitle(data.chapterTitle || '')
    } catch {
      setIsPlaying(false)
      stateRef.current.isPlaying = false
    }
    setPageLoading(false)
    loadingNextPageRef.current = false
  }, [bookId])

  // Init
  useEffect(() => {
    async function init() {
      try {
        const [bookRes, progressRes, contentStartRes] = await Promise.all([
          api.get(`/books/${bookId}`),
          api.get(`/progress/${bookId}`),
          api.get(`/books/${bookId}/content-start`).catch(() => ({ data: { pageNumber: null } })),
        ])
        const b = bookRes.data
        setBook(b)
        stateRef.current.book = b
        setContentStart(contentStartRes.data.pageNumber)

        const requestedPage = Number(searchParams.get('page'))
        const requestedWord = Number(searchParams.get('word'))
        const hasRequestedStart = Number.isFinite(requestedPage) && requestedPage > 0
        const totalPages = Math.max(1, Number(b.totalPages || 1))
        const pg = hasRequestedStart
          ? Math.min(totalPages, Math.max(1, requestedPage))
          : (progressRes.data.pageNumber || 1)

        const pageRes = await api.get(`/books/${bookId}/pages/${pg}`)
        setPageContent(pageRes.data.content || '')
        const w = splitWords(pageRes.data.content)
        const wi = hasRequestedStart
          ? Math.min(Math.max(0, requestedWord || 0), Math.max(0, w.length - 1))
          : (progressRes.data.wordIndex || 0)

        setWords(w)
        stateRef.current.words = w
        setWordIdx(wi)
        stateRef.current.wordIdx = wi
        setCurrentPage(pg)
        stateRef.current.currentPage = pg
        setChapterTitle(pageRes.data.chapterTitle || '')

        if (hasRequestedStart) {
          localStorage.setItem('lastReadAt', new Date().toISOString())
          api.put(`/progress/${bookId}`, { pageNumber: pg, wordIndex: wi }).catch(() => {})
          navigate(`/reader/${bookId}`, { replace: true })
        }
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }
    init()
    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(saveTimerRef.current)
      flushSession()
    }
  }, [bookId, flushSession])

  // Interval
  useEffect(() => {
    if (!isPlaying) {
      clearInterval(intervalRef.current)
      return
    }

    const ms = Math.round(60000 / wpm)
    intervalRef.current = setInterval(() => {
      const s = stateRef.current
      if (!s.words.length || loadingNextPageRef.current) return

      const nextIdx = s.wordIdx + 1

      if (nextIdx >= s.words.length) {
        // End of page
        if (!s.book || s.currentPage >= s.book.totalPages) {
          // End of book
          clearInterval(intervalRef.current)
          setIsPlaying(false)
          stateRef.current.isPlaying = false
          sessionWordsRef.current++
          flushSession()
          saveProgress(s.currentPage, s.wordIdx)
          const stats = getReadingStats()
          const newBooksCompleted = (stats.booksCompleted || 0) + 1
          updateReadingStats({ booksCompleted: newBooksCompleted })
          awardAndShowRef.current(checkTierBadges('bookworm', newBooksCompleted))
          return
        }
        sessionWordsRef.current++
        sessionPagesRef.current++
        loadingNextPageRef.current = true
        saveProgress(s.currentPage + 1, 0)
        loadPage(s.currentPage + 1, 0)
      } else {
        setWordIdx(nextIdx)
        stateRef.current.wordIdx = nextIdx
        sessionWordsRef.current++
        if (nextIdx % 20 === 0) saveProgress(s.currentPage, nextIdx)
      }
    }, ms)

    return () => clearInterval(intervalRef.current)
  }, [isPlaying, wpm, loadPage, saveProgress])

  function togglePlay() {
    const next = !isPlaying
    setIsPlaying(next)
    stateRef.current.isPlaying = next
    if (!next) {
      flushSession()
      saveProgress(stateRef.current.currentPage, stateRef.current.wordIdx)
    }
  }

  function handleWpmChange(val) {
    const clamped = Math.max(50, Math.min(1000, val))
    setWpm(clamped)
    localStorage.setItem('wpm', String(clamped))
    stateRef.current.wpm = clamped
    awardAndShowRef.current(checkTierBadges('speed_demon', clamped))
  }

  function stepBack() {
    const newIdx = Math.max(0, wordIdx - 5)
    setWordIdx(newIdx)
    stateRef.current.wordIdx = newIdx
    saveProgress(currentPage, newIdx)
  }

  function stepForward() {
    const newIdx = Math.min(words.length - 1, wordIdx + 5)
    setWordIdx(newIdx)
    stateRef.current.wordIdx = newIdx
    saveProgress(currentPage, newIdx)
  }

  function goToPrevPage() {
    if (currentPage <= 1) return
    setIsPlaying(false)
    stateRef.current.isPlaying = false
    clearInterval(intervalRef.current)
    loadingNextPageRef.current = false
    saveProgress(currentPage - 1, 0)
    loadPage(currentPage - 1, 0)
  }

  function goToNextPage() {
    if (!book || currentPage >= book.totalPages) return
    setIsPlaying(false)
    stateRef.current.isPlaying = false
    clearInterval(intervalRef.current)
    loadingNextPageRef.current = false
    saveProgress(currentPage + 1, 0)
    loadPage(currentPage + 1, 0)
  }

  function skipToContent() {
    if (!contentStart || contentStart <= currentPage) return
    setIsPlaying(false)
    stateRef.current.isPlaying = false
    clearInterval(intervalRef.current)
    loadingNextPageRef.current = false
    saveProgress(contentStart, 0)
    loadPage(contentStart, 0)
  }

  function looksLikeFrontMatter(title, content, wordCount) {
    const t = String(title || '').toLowerCase()
    const c = String(content || '').toLowerCase()

    // Heuristic: treat very short pages as front matter unless explicitly titled as a chapter.
    const chapterish = /\b(chapter\s*\d+|prologue|epilogue)\b/.test(t) || /\bchapter\s*\d+\b/.test(c)
    if (!chapterish && wordCount < 120) return true

    const frontMatterRe = /\b(copyright|all\s+rights\s+reserved|isbn|edition|publisher|published|printing|publication|library\s+of\s+congress|contents|table\s+of\s+contents|dedication|preface|foreword|acknowledg(?:e|ement)|introduction|title\s+page|about\s+the\s+author)\b/
    return frontMatterRe.test(t) || frontMatterRe.test(c)
  }

  const isInFrontMatter = book
    ? ((contentStart && currentPage < contentStart) || (!contentStart && currentPage <= 20 && looksLikeFrontMatter(chapterTitle, pageContent, words.length)))
    : false

  async function findAndSkipFrontMatter() {
    if (findingContentStart || pageLoading || !book) return

    setFindingContentStart(true)
    setIsPlaying(false)
    stateRef.current.isPlaying = false
    clearInterval(intervalRef.current)
    loadingNextPageRef.current = false

    try {
      // Scan a small window near the beginning of the book.
      const scanFrom = 1
      const scanTo = Math.min(book.totalPages || 1, 30)

      let candidate = null
      for (let p = scanFrom; p <= scanTo; p++) {
        // eslint-disable-next-line no-await-in-loop
        const { data } = await api.get(`/books/${bookId}/pages/${p}`)
        const wc = splitWords(data.content || '').length
        const fm = looksLikeFrontMatter(data.chapterTitle, data.content, wc)

        // Prefer pages with a meaningful title and enough text.
        const title = String(data.chapterTitle || '').trim()
        const hasMeaningfulTitle = title.length > 0 && !looksLikeFrontMatter(title, '', 9999)

        if (!fm && (wc >= 200 || (hasMeaningfulTitle && wc >= 80))) {
          candidate = p
          break
        }
      }

      const target = candidate || Math.min(book.totalPages || 1, Math.max(currentPage + 5, 2))
      setContentStart(target)
      saveProgress(target, 0)
      loadPage(target, 0)
    } finally {
      setFindingContentStart(false)
    }
  }

  async function handleBack() {
    clearInterval(intervalRef.current)
    flushSession()
    await saveProgressNow(stateRef.current.currentPage, stateRef.current.wordIdx)
    navigate(-1)
  }

  const progress = book
    ? Math.min(100, Math.round(((currentPage - 1) / book.totalPages) * 100 + (wordIdx / Math.max(words.length, 1)) * (100 / book.totalPages)))
    : 0

  const remainingWords = book
    ? Math.max(0, (book.totalPages - currentPage) * 300 + (words.length - wordIdx))
    : 0
  const minutesLeft = Math.round(remainingWords / wpm)

  const readingGoal = (() => {
    try { return JSON.parse(localStorage.getItem('readingGoal') || 'null') } catch { return null }
  })()
  const liveWords = todayStats.words + sessionWordsRef.current
  const livePages = todayStats.pages + sessionPagesRef.current
  const goalCurrent = readingGoal?.enabled ? (readingGoal.type === 'words' ? liveWords : livePages) : 0
  const goalPct = readingGoal?.enabled ? Math.min(100, Math.round((goalCurrent / readingGoal.target) * 100)) : 0
  const goalDone = readingGoal?.enabled && goalCurrent >= readingGoal.target

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh bg-shade-white items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-shade-white select-none" onClick={() => setShowControls(p => !p)}>
      {/* Progress bar */}
      <div className={`bg-neutral-2 shrink-0 transition-all duration-300 ${showControls ? 'h-2' : 'h-0.5'}`}>
        <div className="h-full bg-primary-1 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Top bar */}
      <div
        className={`flex items-center justify-between px-5 pt-12 pb-3 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={handleBack} className="flex items-center gap-2 text-neutral-4 active:opacity-60">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[13px] font-medium text-neutral-4">Back</span>
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            {chapterTitle && (
              <p className="text-[12px] text-neutral-5 truncate max-w-[120px] sm:max-w-[180px]">{chapterTitle}</p>
            )}
            <p className="text-[12px] text-neutral-6">p.{currentPage}/{book?.totalPages} · {minutesLeft}m left</p>
          </div>

          {book && isInFrontMatter && (
            <button
              onClick={contentStart && contentStart > currentPage ? skipToContent : findAndSkipFrontMatter}
              disabled={pageLoading || findingContentStart}
              className="shrink-0 px-3 py-2 rounded-xl bg-neutral-2 active:bg-neutral-3 transition-colors disabled:opacity-30"
              title={contentStart && contentStart > currentPage ? `Skip to p.${contentStart}` : 'Find the start of the book'}
            >
              <span className="text-[12px] font-medium text-neutral-4">
                {findingContentStart ? 'Skipping…' : (contentStart && contentStart > currentPage ? `Skip intro` : 'Skip intro')}
                {contentStart && contentStart > currentPage && !findingContentStart ? (
                  <span className="text-neutral-6"> (p.{contentStart})</span>
                ) : null}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Word display */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4">
        {/* Guide lines */}
        <div className="relative w-full flex items-center justify-center">
          <div className="absolute left-0 right-0 flex items-center pointer-events-none px-4">
            <div className="flex-1 h-px bg-neutral-2" />
            <div className="w-40" />
            <div className="flex-1 h-px bg-neutral-2" />
          </div>
          <div className="relative min-w-[240px] min-h-[80px] flex items-center justify-center">
            {pageLoading ? (
              <div className="w-6 h-6 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
            ) : (
              <WordDisplay word={words[wordIdx] || ''} />
            )}
          </div>
        </div>

        <p className="text-neutral-6 text-[12px] tabular-nums">
          {wordIdx + 1} / {words.length}
        </p>
      </div>

      {/* Controls */}
      <div
        className={`px-6 pb-14 pt-4 flex flex-col gap-5 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Daily goal */}
        {readingGoal?.enabled && (
          <div className="flex items-center gap-3 px-1">
            <span className="text-[12px] text-neutral-5 tabular-nums shrink-0">
              {goalCurrent.toLocaleString()} / {readingGoal.target.toLocaleString()} {readingGoal.type}
            </span>
            <div className="flex-1 h-1 rounded-full bg-neutral-2 overflow-hidden">
              <div className="h-full bg-primary-1 rounded-full transition-all duration-300" style={{ width: `${goalPct}%` }} />
            </div>
            {goalDone && <span className="text-[11px] font-bold text-primary-1 shrink-0">Done!</span>}
          </div>
        )}

        {/* WPM */}
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => handleWpmChange(wpm - 25)}
            className="w-10 h-10 rounded-full bg-neutral-2 flex items-center justify-center active:bg-neutral-3 transition-colors"
          >
            <svg width="16" height="2" viewBox="0 0 16 2" fill="none" className="text-neutral-8">
              <path d="M0 1h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="text-center w-24">
            <p className="text-[22px] font-bold text-neutral-8 leading-none">{wpm}</p>
            <p className="text-[10px] text-neutral-5 uppercase tracking-wider mt-1">words / min</p>
          </div>
          <button
            onClick={() => handleWpmChange(wpm + 25)}
            className="w-10 h-10 rounded-full bg-neutral-2 flex items-center justify-center active:bg-neutral-3 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-neutral-8">
              <path d="M8 0v16M0 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Playback */}
        <div className="flex items-center justify-center gap-7">
          <button
            onClick={stepBack}
            className="w-12 h-12 rounded-full bg-neutral-2 flex items-center justify-center active:bg-neutral-3 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
              <path d="M19 5L9 12l10 7V5Z" fill="currentColor"/>
              <rect x="4" y="5" width="3" height="14" rx="1.5" fill="currentColor"/>
            </svg>
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full rsvp-reader-play-bg flex items-center justify-center active:opacity-80 transition-opacity"
          >
            {isPlaying ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="rsvp-reader-play-fg">
                <rect x="5" y="4" width="4" height="16" rx="1.5" fill="currentColor"/>
                <rect x="15" y="4" width="4" height="16" rx="1.5" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="rsvp-reader-play-fg">
                <path d="M7 4l13 8-13 8V4Z" fill="currentColor"/>
              </svg>
            )}
          </button>

          <button
            onClick={stepForward}
            className="w-12 h-12 rounded-full bg-neutral-2 flex items-center justify-center active:bg-neutral-3 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
              <path d="M5 5l10 7-10 7V5Z" fill="currentColor"/>
              <rect x="17" y="5" width="3" height="14" rx="1.5" fill="currentColor"/>
            </svg>
          </button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1 || pageLoading}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-2 active:bg-neutral-3 transition-colors disabled:opacity-30"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-neutral-4 shrink-0">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[12px] font-medium text-neutral-4">Prev</span>
          </button>

          <span className="text-[12px] text-neutral-6 tabular-nums">
            {currentPage} / {book?.totalPages}
          </span>

          <button
            onClick={goToNextPage}
            disabled={!book || currentPage >= book.totalPages || pageLoading}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-neutral-2 active:bg-neutral-3 transition-colors disabled:opacity-30"
          >
            <span className="text-[12px] font-medium text-neutral-4">Next</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-neutral-4 shrink-0">
              <path d="M5 12h14M14 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Skip intro button — only visible while still in the front matter */}
        {isInFrontMatter && contentStart && contentStart > currentPage && (
          <button
            onClick={skipToContent}
            disabled={pageLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-2 active:bg-neutral-3 transition-colors disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
              <path d="M5 5l10 7-10 7V5Z" fill="currentColor"/>
              <path d="M19 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="text-[13px] font-medium text-neutral-4">
              Skip intro <span className="text-neutral-6">(p.{contentStart})</span>
            </span>
          </button>
        )}
      </div>

      {badgeQueue.length > 0 && (
        <BadgeToast badgeId={badgeQueue[0]} onDismiss={() => setBadgeQueue(q => q.slice(1))} />
      )}
    </div>
  )
}
