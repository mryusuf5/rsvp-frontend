import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import BottomNav from '../components/BottomNav'

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/books')
      .then(r => setBooks(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = query.trim()
    ? books.filter(b =>
        b.title.toLowerCase().includes(query.toLowerCase()) ||
        (b.author && b.author.toLowerCase().includes(query.toLowerCase()))
      )
    : books

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="px-6 pt-14 pb-4">
        <h1 className="text-[26px] font-bold text-neutral-8 mb-5">
          <span className="text-primary-1">Search</span> files
        </h1>
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-4" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title or author…"
            autoFocus
            className="w-full bg-shade-white rounded-2xl pl-11 pr-4 py-3.5 text-neutral-8 placeholder-neutral-4 border border-neutral-2 focus:outline-none focus:border-primary-1 transition-colors text-[15px]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-4"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="px-6">
        {loading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <div key={i} className="bg-shade-white rounded-2xl h-16 animate-pulse" />)}
            </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-neutral-4 text-sm">
              {query ? `No results for "${query}"` : 'No files in your library yet'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(book => (
              <button
                key={book.id}
                onClick={() => navigate(`/reader/${book.id}`)}
                className="w-full flex items-center gap-3 bg-shade-white rounded-2xl px-4 py-3.5 shadow-card active:opacity-75 transition-opacity text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-neutral-1 flex items-center justify-center shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-neutral-5">
                    <path d="M4 19V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                      stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                    <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[14px] font-medium text-neutral-8 truncate">{book.title}</p>
                  {book.author && (
                    <p className="text-[12px] text-neutral-4 mt-0.5 truncate">{book.author}</p>
                  )}
                </div>
                <span className="text-[11px] text-neutral-4 uppercase font-medium">{book.format}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
