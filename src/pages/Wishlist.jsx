import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { getWishlist, removeFromWishlist } from '../lib/wishlist'
import { useBookCover } from '../hooks/useBookCover'

function WishlistItem({ item, onRemove }) {
  const navigate = useNavigate()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const isEpub = item.format === 'epub'
  const { url: coverUrl, status: coverStatus } = useBookCover(item.title, item.author, isEpub)
  const [coverError, setCoverError] = useState(false)
  const [coverImgLoaded, setCoverImgLoaded] = useState(false)

  const showSpinner = isEpub && !coverError && !coverImgLoaded && (coverStatus === 'loading' || coverStatus === 'success')
  const showFallback = !coverUrl || coverError || coverStatus === 'not_found' || coverStatus === 'error'

  const addedDate = new Date(item.addedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  function handleRemove(e) {
    e.stopPropagation()
    if (!confirmRemove) {
      setConfirmRemove(true)
      setTimeout(() => setConfirmRemove(false), 3000)
      return
    }
    onRemove(item.key)
  }

  return (
    <div className="bg-shade-white rounded-2xl shadow-card px-4 py-3.5 flex items-start gap-3">
      <div className="relative w-11 h-11 rounded-xl bg-neutral-1 flex items-center justify-center shrink-0 overflow-hidden">
        {coverUrl && !coverError && (
          <img
            src={coverUrl}
            alt={item.title}
            onLoad={() => setCoverImgLoaded(true)}
            onError={() => setCoverError(true)}
            className="w-full h-full object-cover"
          />
        )}
        {showSpinner && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="w-4 h-4 border-2 border-primary-1 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!showSpinner && showFallback && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-neutral-4">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0" onClick={() => navigate(`/profile/${item.fromUserId}`)}>
        <p className="text-[14px] font-semibold text-neutral-8 truncate">{item.title}</p>
        {item.author && <p className="text-[12px] text-neutral-5 mt-0.5 truncate">{item.author}</p>}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
          {item.year && (
            <span className="text-[11px] text-neutral-4">{item.year}</span>
          )}
          {item.genre && (
            <span className="text-[11px] text-neutral-4 truncate max-w-[160px]">{item.genre}</span>
          )}
          <span className="text-[11px] font-semibold text-primary-1 uppercase">{item.format}</span>
        </div>

        <p className="text-[11px] text-neutral-4 mt-1.5">
          From <span className="font-medium text-neutral-6">{item.fromUserName}</span> · {addedDate}
        </p>
      </div>

      <button
        onClick={handleRemove}
        className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:opacity-70 ${confirmRemove ? 'bg-error-2 text-shade-white' : 'bg-neutral-1 text-neutral-4'}`}
        aria-label="Remove from wishlist"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

export default function Wishlist() {
  const [items, setItems] = useState(() => getWishlist())

  const handleRemove = useCallback((key) => {
    removeFromWishlist(key)
    setItems(getWishlist())
  }, [])

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <div className="px-6 pt-14 pb-6">
        <h1 className="text-[22px] font-bold text-neutral-8">
          <span className="text-primary-1">Wishlist</span>
        </h1>
        {items.length > 0 && (
          <p className="text-[13px] text-neutral-4 mt-1">{items.length} {items.length === 1 ? 'book' : 'books'}</p>
        )}
      </div>

      <div className="px-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-neutral-3">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
                stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[14px] text-neutral-4 text-center">
              No books yet.<br/>Browse a friend's profile to add some.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map(item => (
              <WishlistItem key={item.key} item={item} onRemove={handleRemove} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
