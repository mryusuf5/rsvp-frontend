import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import BottomNav from '../components/BottomNav'
import { useBookCover } from '../hooks/useBookCover'

function SearchResult({ book, onClick }) {
  const isEpub = book.format === 'epub'
  const { url: coverUrl, status: coverStatus } = useBookCover(book.title, book.author, isEpub)
  const [coverError, setCoverError] = useState(false)
  const [coverImgLoaded, setCoverImgLoaded] = useState(false)

  useEffect(() => {
    setCoverError(false)
    setCoverImgLoaded(false)
  }, [coverUrl])

  const showSpinner = isEpub && !coverError && !coverImgLoaded && (coverStatus === 'loading' || coverStatus === 'success')
  const showFallback = !coverUrl || coverError || coverStatus === 'not_found' || coverStatus === 'error'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-shade-white rounded-2xl px-4 py-3.5 shadow-card active:opacity-75 transition-opacity text-left"
    >
      <div className="w-11 h-11 rounded-xl bg-neutral-1 flex items-center justify-center shrink-0 overflow-hidden relative">
        {coverUrl && !coverError && (
          <img src={coverUrl} alt={book.title} onLoad={() => setCoverImgLoaded(true)} onError={() => setCoverError(true)} className="w-full h-full object-cover" />
        )}
        {showSpinner && (
          <div className="absolute inset-0 grid place-items-center" aria-hidden>
            <div className="w-4 h-4 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!showSpinner && showFallback && (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-neutral-5">
            <path d="M4 19V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[14px] font-medium text-neutral-8 truncate">{book.title}</p>
        {book.author && <p className="text-[12px] text-neutral-4 mt-0.5 truncate">{book.author}</p>}
      </div>
      <span className="text-[11px] text-neutral-4 uppercase font-medium">{book.format}</span>
    </button>
  )
}

function UserResult({ user, onClick }) {
  const initial = user.name?.[0]?.toUpperCase() ?? '?'
  const followedSince = user.followedSince
    ? new Date(user.followedSince).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const joinDate = !followedSince && user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-shade-white rounded-2xl px-4 py-3.5 shadow-card active:opacity-75 transition-opacity text-left"
    >
      <div className="w-11 h-11 rounded-xl bg-primary-1 flex items-center justify-center shrink-0">
        <span className="text-shade-white text-[16px] font-bold">{initial}</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[14px] font-medium text-neutral-8 truncate">{user.name}</p>
        {followedSince && <p className="text-[12px] text-neutral-4 mt-0.5">Following since {followedSince}</p>}
        {joinDate && <p className="text-[12px] text-neutral-4 mt-0.5">Member since {joinDate}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {user.isPrivate && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        )}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </button>
  )
}

export default function Search() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('files')
  const [query, setQuery] = useState('')

  const [books, setBooks] = useState([])
  const [booksLoading, setBooksLoading] = useState(true)

  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    api.get('/books')
      .then(r => setBooks(r.data))
      .catch(() => {})
      .finally(() => setBooksLoading(false))
  }, [])

  // Debounced user search
  useEffect(() => {
    if (tab !== 'people' || !query.trim()) {
      setUsers([])
      setHasSearched(false)
      return
    }
    setUsersLoading(true)
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/users?name=${encodeURIComponent(query.trim())}`)
        setUsers(Array.isArray(data) ? data : (data['hydra:member'] ?? []))
        setHasSearched(true)
      } catch {
        setUsers([])
        setHasSearched(true)
      } finally {
        setUsersLoading(false)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [query, tab])

  function switchTab(newTab) {
    setTab(newTab)
    setQuery('')
    setUsers([])
    setHasSearched(false)
  }

  const filteredBooks = query.trim()
    ? books.filter(b =>
        b.title.toLowerCase().includes(query.toLowerCase()) ||
        (b.author && b.author.toLowerCase().includes(query.toLowerCase()))
      )
    : books

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="px-6 pt-14 pb-4">
        <h1 className="text-[22px] font-bold text-neutral-8 mb-5">
          <span className="text-primary-1">Search</span>
        </h1>

        {/* Tab switcher */}
        <div className="flex bg-neutral-1 rounded-2xl p-1 mb-4">
          {[['files', 'Files'], ['people', 'People']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors ${
                tab === id ? 'bg-shade-white text-neutral-8 shadow-card' : 'text-neutral-5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-4" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === 'files' ? 'Search by title or author…' : 'Search by name…'}
            autoFocus
            className="w-full bg-shade-white rounded-2xl pl-11 pr-4 py-3.5 text-neutral-8 placeholder-neutral-4 border border-neutral-2 focus:outline-none focus:border-primary-1 transition-colors text-[15px]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="px-6">
        {tab === 'files' && (
          booksLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => <div key={i} className="bg-shade-white rounded-2xl h-16 animate-pulse" />)}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-4 text-sm">
                {query ? `No results for "${query}"` : 'No files in your library yet'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredBooks.map(book => (
                <SearchResult key={book.id} book={book} onClick={() => navigate(`/reader/${book.id}`)} />
              ))}
            </div>
          )
        )}

        {tab === 'people' && (
          usersLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map(i => <div key={i} className="bg-shade-white rounded-2xl h-16 animate-pulse" />)}
            </div>
          ) : !query.trim() ? (
            <div className="text-center py-12">
              <p className="text-neutral-4 text-sm">Search for a reader by name</p>
            </div>
          ) : hasSearched && users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-4 text-sm">No users found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map(user => (
                <UserResult key={user.id} user={user} onClick={() => navigate(`/profile/${user.id}`)} />
              ))}
            </div>
          )
        )}

      </div>

      <BottomNav />
    </div>
  )
}
