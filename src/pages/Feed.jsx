import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { resolveUrl } from '../lib/api'
import BottomNav from '../components/BottomNav'
import { useBookCover } from '../hooks/useBookCover'

function BearSad() {
  const [html, setHtml] = useState('')
  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetch('/bear-sad.svg').then(r => r.text()).then(setHtml)
  }, [])
  return (
    <div
      className="text-neutral-3 [&>svg]:w-full [&>svg]:h-full"
      style={{ width: 140, height: 140 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function FeedItem({ item }) {
  const navigate = useNavigate()
  const { url: coverUrl, status: coverStatus } = useBookCover(
    item.book.title, item.book.author, item.book.format === 'epub'
  )
  const [coverError, setCoverError] = useState(false)
  const [coverImgLoaded, setCoverImgLoaded] = useState(false)

  const showSpinner = !coverError && !coverImgLoaded &&
    (coverStatus === 'loading' || coverStatus === 'success')
  const showFallback = !coverUrl || coverError ||
    coverStatus === 'not_found' || coverStatus === 'error'

  const updatedAt = new Date(item.progress.updatedAt)
  const now = new Date()
  const diffMs = now - updatedAt
  const diffMins = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)

  const timeAgo = diffDays > 0
    ? `${diffDays}d ago`
    : diffHrs > 0
    ? `${diffHrs}h ago`
    : diffMins > 1
    ? `${diffMins}m ago`
    : 'just now'

  return (
    <button
      onClick={() => navigate(`/profile/${item.user.id}`)}
      className="w-full bg-shade-white rounded-3xl p-4 shadow-card text-left active:opacity-75 transition-opacity"
    >
      {/* User row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary-1 flex items-center justify-center shrink-0 overflow-hidden">
          {item.user.avatarUrl ? (
            <img src={resolveUrl(item.user.avatarUrl)} alt={item.user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-shade-white text-[13px] font-bold uppercase">
              {item.user.name?.[0] ?? '?'}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-neutral-8 truncate">{item.user.name}</p>
          <p className="text-[11px] text-neutral-4">Reading · {timeAgo}</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-3 shrink-0">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Book row */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-neutral-1 flex items-center justify-center shrink-0 overflow-hidden">
          {coverUrl && !coverError && (
            <img
              src={coverUrl}
              alt={item.book.title}
              onLoad={() => setCoverImgLoaded(true)}
              onError={() => setCoverError(true)}
              className="w-full h-full object-cover"
            />
          )}
          {showSpinner && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="w-3.5 h-3.5 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!showSpinner && showFallback && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
              <path d="M4 19V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-neutral-8 truncate">{item.book.title}</p>
          {item.book.author && (
            <p className="text-[11px] text-neutral-4 truncate">{item.book.author}</p>
          )}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-neutral-1 overflow-hidden">
              <div
                className="h-full bg-primary-1 rounded-full"
                style={{ width: `${item.progress.pct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-neutral-5 shrink-0">
              {item.progress.pct}%
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}

export default function Feed() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/feed')
      .then(r => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const aheadFriends = (() => {
    if (items.length === 0) return []
    const lastReadAt = localStorage.getItem('lastReadAt')
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    return items.filter(item => {
      const friendTime = new Date(item.progress.updatedAt).getTime()
      if (friendTime < cutoff) return false
      if (!lastReadAt) return true
      return friendTime > new Date(lastReadAt).getTime()
    })
  })()

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="px-6 pt-14 pb-6">
        <h1 className="text-[22px] font-bold text-neutral-8">
          <span className="text-primary-1">Friends</span>
        </h1>
        <p className="text-[13px] text-neutral-4 mt-1">What your friends are reading</p>
      </div>

      {aheadFriends.length > 0 && (
        <div className="mx-6 mb-4 bg-shade-white rounded-2xl px-4 py-3 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[16px]">👀</span>
            <p className="text-[13px] font-semibold text-neutral-8">
              {aheadFriends.length === 1 ? '1 friend is' : `${aheadFriends.length} friends are`} ahead of you this week
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {aheadFriends.map(item => (
              <div key={item.user.id} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary-1 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.user.avatarUrl ? (
                    <img src={resolveUrl(item.user.avatarUrl)} alt={item.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-shade-white text-[11px] font-bold uppercase">{item.user.name?.[0] ?? '?'}</span>
                  )}
                </div>
                <p className="text-[13px] text-neutral-6 truncate flex-1">
                  <span className="font-semibold text-neutral-8">{item.user.name}</span>
                  {' · '}{item.book.title}
                </p>
                <span className="text-[12px] font-bold text-primary-1 shrink-0">{item.progress.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-shade-white rounded-3xl h-28 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[60vh] gap-4">
            <BearSad />
            <p className="text-[14px] text-neutral-4 text-center leading-relaxed max-w-[240px]">
              Don't be shy — go make some friends and they'll show up here when they read.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map(item => (
              <FeedItem key={item.user.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
