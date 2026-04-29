import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { resolveUrl } from '../lib/api'

const LIMIT = 20

export default function FollowListSheet({ type, onClose }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const [dragY, setDragY] = useState(0)
  const dragging = useRef(false)
  const startY = useRef(0)
  const sentinelRef = useRef(null)

  const endpoint = type === 'followers' ? '/me/followers' : '/me/following'
  const title = type === 'followers' ? 'Followers' : 'Following'

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    api.get(endpoint, { params: { page: 1 } })
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : []
        setUsers(data)
        setHasMore(data.length === LIMIT)
        setPage(2)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [endpoint])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    api.get(endpoint, { params: { page } })
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : []
        setUsers(prev => [...prev, ...data])
        setHasMore(data.length === LIMIT)
        setPage(p => p + 1)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }, [endpoint, page, loadingMore, hasMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMore()
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  function handleTouchStart(e) {
    dragging.current = true
    startY.current = e.touches[0].clientY
  }

  function handleTouchMove(e) {
    if (!dragging.current) return
    setDragY(Math.max(0, e.touches[0].clientY - startY.current))
  }

  function handleTouchEnd() {
    dragging.current = false
    if (dragY > 100) onClose()
    else setDragY(0)
  }

  function handleUserClick(userId) {
    onClose()
    navigate(`/profile/${userId}`)
  }

  const backdropOpacity = Math.max(0, 0.4 - dragY / 300)

  return (
    <>
      <div
        className="fixed inset-0 z-[55]"
        style={{ backgroundColor: `rgba(0,0,0,${backdropOpacity})` }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 w-full max-w-[430px] bg-shade-white rounded-t-3xl z-[60] flex flex-col"
        style={{
          height: '80dvh',
          left: '50%',
          transform: `translateX(-50%) translateY(${dragY}px)`,
          transition: dragging.current ? 'none' : 'transform 0.25s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-3" />
        </div>

        <div className="px-5 pb-3 shrink-0">
          <p className="text-[16px] font-bold text-neutral-8">{title}</p>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-8 flex flex-col gap-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center flex-1 py-12">
              <p className="text-[14px] text-neutral-4">No {title.toLowerCase()} yet</p>
            </div>
          ) : (
            <>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleUserClick(u.id)}
                  className="flex items-center gap-3 bg-neutral-1 rounded-2xl px-4 py-3 active:opacity-70 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-1 flex items-center justify-center shrink-0 overflow-hidden">
                    {u.avatarUrl ? (
                      <img src={resolveUrl(u.avatarUrl)} alt={u.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-shade-white text-[14px] font-bold">
                        {u.name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-neutral-8 truncate">{u.name}</p>
                    {u.followedSince && (
                      <p className="text-[11px] text-neutral-4 mt-0.5">
                        Since {new Date(u.followedSince).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-neutral-4 shrink-0">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
              <div ref={sentinelRef} className="h-4" />
              {loadingMore && (
                <div className="flex justify-center py-3">
                  <div className="w-5 h-5 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
