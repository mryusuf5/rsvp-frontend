import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../lib/api'
import { splitWords, tokenizePageContent } from '../lib/readerText'

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function readerPath(bookId, pageNumber, wordIndex) {
  return `/reader/${bookId}?page=${pageNumber}&word=${wordIndex}`
}

export default function BookPreview() {
  const { bookId } = useParams()
  const navigate = useNavigate()

  const [book, setBook] = useState(null)
  const [pageContent, setPageContent] = useState('')
  const [chapterTitle, setChapterTitle] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [wordIndex, setWordIndex] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [error, setError] = useState('')
  const activeWordRef = useRef(null)

  const tokens = useMemo(() => tokenizePageContent(pageContent), [pageContent])

  const loadPage = useCallback(async (targetPage, targetWord = 0) => {
    setPageLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/books/${bookId}/pages/${targetPage}`)
      const nextContent = data.content || ''
      const words = splitWords(nextContent)
      const lastWordIndex = Math.max(0, words.length - 1)
      const nextWordIndex = clamp(Number(targetWord) || 0, 0, lastWordIndex)

      setPageContent(nextContent)
      setChapterTitle(data.chapterTitle || '')
      setPageNumber(targetPage)
      setWordIndex(nextWordIndex)
      setWordCount(words.length)
    } catch {
      setError('Could not load this page.')
    } finally {
      setPageLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setError('')
      try {
        const [bookRes, progressRes] = await Promise.all([
          api.get(`/books/${bookId}`),
          api.get(`/progress/${bookId}`),
        ])

        if (cancelled) return

        const nextBook = bookRes.data
        const totalPages = Math.max(1, Number(nextBook.totalPages || 1))
        const progress = progressRes.data || {}
        const targetPage = clamp(Number(progress.pageNumber) || 1, 1, totalPages)
        const targetWord = Math.max(0, Number(progress.wordIndex) || 0)

        setBook(nextBook)
        await loadPage(targetPage, targetWord)
      } catch {
        if (!cancelled) setError('Could not open this book.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()
    return () => { cancelled = true }
  }, [bookId, loadPage])

  useEffect(() => {
    if (!activeWordRef.current || loading || pageLoading) return
    const frame = requestAnimationFrame(() => {
      activeWordRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [loading, pageLoading, pageNumber, wordIndex])

  function openReader(targetWord = wordIndex) {
    navigate(readerPath(bookId, pageNumber, targetWord))
  }

  function goToPage(targetPage) {
    if (!book || pageLoading) return
    const clampedPage = clamp(targetPage, 1, Math.max(1, Number(book.totalPages || 1)))
    if (clampedPage === pageNumber) return
    loadPage(clampedPage, 0)
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-shade-white">
        <div className="w-8 h-8 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !book) {
    return (
      <div className="min-h-dvh bg-shade-white px-6 pt-14">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-4 active:opacity-60">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[13px] font-medium">Back</span>
        </button>
        <div className="mt-16 text-center">
          <p className="text-[16px] font-semibold text-neutral-8">{error}</p>
          <button onClick={() => navigate('/')} className="mt-4 text-[14px] font-semibold text-primary-1">
            Go to library
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-shade-white pb-40">
      <div className="sticky top-0 z-20 bg-shade-white/95 backdrop-blur border-b border-neutral-2">
        <div className="px-5 pt-12 pb-3 flex items-center justify-between gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-4 active:opacity-60 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[13px] font-medium">Back</span>
          </button>

          <div className="text-right min-w-0">
            <p className="text-[13px] font-semibold text-neutral-8 truncate">{book?.title}</p>
            <p className="text-[12px] text-neutral-5">
              p.{pageNumber}/{book?.totalPages}
              {wordCount > 0 ? ` · word ${wordIndex + 1}/${wordCount}` : ''}
            </p>
          </div>
        </div>
      </div>

      <main className="px-6 pt-6">
        {chapterTitle && (
          <p className="text-[12px] font-bold uppercase tracking-widest text-primary-1 mb-4">
            {chapterTitle}
          </p>
        )}

        <div className="relative">
          {pageLoading && (
            <div className="absolute inset-0 z-10 bg-shade-white/80 grid place-items-center rounded-2xl">
              <div className="w-7 h-7 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error ? (
            <div className="rounded-2xl bg-neutral-1 px-5 py-8 text-center">
              <p className="text-[14px] text-neutral-5">{error}</p>
            </div>
          ) : (
            <div className="text-[18px] leading-8 text-neutral-8 whitespace-pre-wrap">
              {tokens.length === 0 ? (
                <p className="text-[14px] text-neutral-4">This page is empty.</p>
              ) : (
                tokens.map(token => {
                  if (token.type === 'space') return <span key={token.key}>{token.text}</span>

                  const active = token.wordIndex === wordIndex
                  return (
                    <button
                      key={token.key}
                      ref={active ? activeWordRef : null}
                      onClick={() => openReader(token.wordIndex)}
                      className={`inline rounded-md px-0.5 -mx-0.5 align-baseline text-left transition-colors ${
                        active
                          ? 'bg-primary-1 text-shade-white shadow-card'
                          : 'text-neutral-8 active:bg-neutral-2'
                      }`}
                    >
                      {token.text}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-neutral-2 bg-shade-white px-6 pb-6 pt-3">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => goToPage(pageNumber - 1)}
            disabled={pageNumber <= 1 || pageLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-2 active:bg-neutral-3 transition-colors disabled:opacity-30"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-neutral-4 shrink-0">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[12px] font-medium text-neutral-4">Prev</span>
          </button>

          <span className="text-[12px] text-neutral-6 tabular-nums">
            {pageNumber} / {book?.totalPages}
          </span>

          <button
            onClick={() => goToPage(pageNumber + 1)}
            disabled={!book || pageNumber >= book.totalPages || pageLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-2 active:bg-neutral-3 transition-colors disabled:opacity-30"
          >
            <span className="text-[12px] font-medium text-neutral-4">Next</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-neutral-4 shrink-0">
              <path d="M5 12h14M14 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <button
          onClick={() => openReader()}
          disabled={pageLoading}
          className="w-full bg-primary-1 text-shade-white font-semibold text-[15px] rounded-2xl py-3.5 active:opacity-80 disabled:opacity-40"
        >
          Continue in reader
        </button>
      </div>
    </div>
  )
}
