import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

function WordDisplay({ word }) {
  if (!word) return <span className="text-neutral-6 text-4xl font-bold">•••</span>
  const ci = Math.floor(word.length / 2)
  return (
    <div className="flex items-baseline justify-center font-bold text-4xl tracking-wide select-none">
      <span className="text-shade-white opacity-90">{word.slice(0, ci)}</span>
      <span className="rsvp-reader-accent">{word[ci]}</span>
      <span className="text-shade-white opacity-90">{word.slice(ci + 1)}</span>
    </div>
  )
}

function splitWords(content) {
  return content.split(/\s+/).filter(w => w.length > 0)
}

export default function Reader() {
  const { bookId } = useParams()
  const navigate = useNavigate()

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

  // Refs that always hold latest values — used inside setInterval
  const stateRef = useRef({ words: [], wordIdx: 0, currentPage: 1, isPlaying: false, book: null, wpm: 250 })
  const intervalRef = useRef(null)
  const saveTimerRef = useRef(null)
  const loadingNextPageRef = useRef(false)

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = { words, wordIdx, currentPage, isPlaying, book, wpm }
  })

  const saveProgress = useCallback((pageNum, wi) => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      api.put(`/progress/${bookId}`, { pageNumber: pageNum, wordIndex: wi }).catch(() => {})
    }, 600)
  }, [bookId])

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

        const pg = progressRes.data.pageNumber || 1
        const wi = progressRes.data.wordIndex || 0

        const pageRes = await api.get(`/books/${bookId}/pages/${pg}`)
        setPageContent(pageRes.data.content || '')
        const w = splitWords(pageRes.data.content)

        setWords(w)
        stateRef.current.words = w
        setWordIdx(wi)
        stateRef.current.wordIdx = wi
        setCurrentPage(pg)
        stateRef.current.currentPage = pg
        setChapterTitle(pageRes.data.chapterTitle || '')
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }
    init()
    return () => {
      clearInterval(intervalRef.current)
      clearTimeout(saveTimerRef.current)
    }
  }, [bookId])

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
          saveProgress(s.currentPage, s.wordIdx)
          return
        }
        loadingNextPageRef.current = true
        saveProgress(s.currentPage + 1, 0)
        loadPage(s.currentPage + 1, 0)
      } else {
        setWordIdx(nextIdx)
        stateRef.current.wordIdx = nextIdx
        if (nextIdx % 20 === 0) saveProgress(s.currentPage, nextIdx)
      }
    }, ms)

    return () => clearInterval(intervalRef.current)
  }, [isPlaying, wpm, loadPage, saveProgress])

  function togglePlay() {
    const next = !isPlaying
    setIsPlaying(next)
    stateRef.current.isPlaying = next
    if (!next) saveProgress(stateRef.current.currentPage, stateRef.current.wordIdx)
  }

  function handleWpmChange(val) {
    const clamped = Math.max(50, Math.min(1000, val))
    setWpm(clamped)
    localStorage.setItem('wpm', String(clamped))
    stateRef.current.wpm = clamped
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

  function handleBack() {
    clearInterval(intervalRef.current)
    saveProgress(stateRef.current.currentPage, stateRef.current.wordIdx)
    navigate(-1)
  }

  const progress = book
    ? Math.min(100, Math.round(((currentPage - 1) / book.totalPages) * 100 + (wordIdx / Math.max(words.length, 1)) * (100 / book.totalPages)))
    : 0

  const remainingWords = book
    ? Math.max(0, (book.totalPages - currentPage) * 300 + (words.length - wordIdx))
    : 0
  const minutesLeft = Math.round(remainingWords / wpm)

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh bg-neutral-8 items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-neutral-8 select-none" onClick={() => setShowControls(p => !p)}>
      {/* Progress bar */}
      <div className="h-0.5 bg-neutral-7 shrink-0">
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
              <p className="text-[12px] text-neutral-5 truncate max-w-[180px]">{chapterTitle}</p>
            )}
            <p className="text-[12px] text-neutral-6">p.{currentPage}/{book?.totalPages} · {minutesLeft}m left</p>
          </div>

          {book && isInFrontMatter && (
            <button
              onClick={contentStart && contentStart > currentPage ? skipToContent : findAndSkipFrontMatter}
              disabled={pageLoading || findingContentStart}
              className="shrink-0 px-3 py-2 rounded-xl bg-neutral-7 active:bg-neutral-6 transition-colors disabled:opacity-30"
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
            <div className="flex-1 h-px bg-neutral-7" />
            <div className="w-40" />
            <div className="flex-1 h-px bg-neutral-7" />
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
        {/* WPM */}
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => handleWpmChange(wpm - 25)}
            className="w-10 h-10 rounded-full bg-neutral-7 flex items-center justify-center active:bg-neutral-6 transition-colors"
          >
            <svg width="16" height="2" viewBox="0 0 16 2" fill="none" className="text-shade-white">
              <path d="M0 1h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="text-center w-28">
            <p className="text-[28px] font-bold text-shade-white leading-none">{wpm}</p>
            <p className="text-[11px] text-neutral-5 uppercase tracking-wider mt-1">words / min</p>
          </div>
          <button
            onClick={() => handleWpmChange(wpm + 25)}
            className="w-10 h-10 rounded-full bg-neutral-7 flex items-center justify-center active:bg-neutral-6 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-shade-white">
              <path d="M8 0v16M0 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Playback */}
        <div className="flex items-center justify-center gap-7">
          <button
            onClick={stepBack}
            className="w-12 h-12 rounded-full bg-neutral-7 flex items-center justify-center active:bg-neutral-6 transition-colors"
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
            className="w-12 h-12 rounded-full bg-neutral-7 flex items-center justify-center active:bg-neutral-6 transition-colors"
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-7 active:bg-neutral-6 transition-colors disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[13px] font-medium text-neutral-4">Prev page</span>
          </button>

          <span className="text-[13px] text-neutral-6 tabular-nums">
            {currentPage} / {book?.totalPages}
          </span>

          <button
            onClick={goToNextPage}
            disabled={!book || currentPage >= book.totalPages || pageLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-7 active:bg-neutral-6 transition-colors disabled:opacity-30"
          >
            <span className="text-[13px] font-medium text-neutral-4">Next page</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
              <path d="M5 12h14M14 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Skip intro button — only visible while still in the front matter */}
        {isInFrontMatter && contentStart && contentStart > currentPage && (
          <button
            onClick={skipToContent}
            disabled={pageLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-7 active:bg-neutral-6 transition-colors disabled:opacity-30"
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
    </div>
  )
}
