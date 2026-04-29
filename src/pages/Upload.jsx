import { useEffect, useState, useRef, useCallback } from 'react'
import api from '../lib/api'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../contexts/AuthContext'
import { useBookCover } from '../hooks/useBookCover'

function FileIcon({ className = 'text-primary-1' }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 19V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  )
}

function AdminUploadCard({ title, description, file, onFileSelect, onClear, onUpload, uploading, error, done, accentClass, buttonLabel = 'Publish' }) {
  const ref = useRef()
  return (
    <div className={`rounded-3xl shadow-card-lg p-5 flex flex-col gap-3 border-2 ${accentClass}`}>
      <div>
        <p className="text-[15px] font-semibold text-neutral-8">{title}</p>
        <p className="text-[12px] text-neutral-4 mt-0.5">{description}</p>
      </div>

      <input
        ref={ref}
        type="file"
        accept=".epub,.pdf"
        className="hidden"
        onChange={e => { onFileSelect(e.target.files[0]); e.target.value = '' }}
      />

      {file ? (
        <div className="flex items-center gap-3 bg-neutral-1 rounded-2xl px-4 py-3">
          <div className="flex-1 overflow-hidden">
            <p className="text-[13px] font-medium text-neutral-8 truncate">{file.name}</p>
            <p className="text-[12px] text-neutral-4">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClear}
              className="text-sm text-neutral-4 px-3 py-1.5 rounded-xl border border-neutral-2 bg-shade-white"
            >
              Remove
            </button>
            <button
              onClick={onUpload}
              disabled={uploading}
              className="text-sm text-shade-white bg-primary-1 px-3 py-1.5 rounded-xl disabled:opacity-60 font-semibold"
            >
              {uploading ? 'Uploading…' : buttonLabel}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          className="flex items-center justify-center gap-2 border-2 border-dashed border-primary-2 rounded-2xl py-4 text-primary-1 font-semibold text-[14px] active:opacity-70 transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Select file
        </button>
      )}

      {error && (
        <div className="bg-error-1 text-error-2 text-sm rounded-xl px-4 py-3">{error}</div>
      )}
      {done && (
        <div className="text-[13px] text-neutral-6 bg-neutral-1 rounded-xl px-4 py-3">{done}</div>
      )}
    </div>
  )
}

function GlobalBookRow({ book, claimed, loading, onClaim, isAdmin, onDelete }) {
  const { url } = useBookCover(book.title, book.author)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const confirmTimerRef = useRef(null)

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      confirmTimerRef.current = setTimeout(() => setConfirmDelete(false), 3000)
    } else {
      clearTimeout(confirmTimerRef.current)
      setConfirmDelete(false)
      onDelete(book.id)
    }
  }

  return (
    <div className="bg-shade-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-card">
      <div className="w-11 h-14 rounded-xl bg-neutral-1 flex items-center justify-center shrink-0 overflow-hidden">
        {url
          ? <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />
          : <FileIcon className="text-neutral-4" />
        }
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[14px] font-medium text-neutral-8 truncate">{book.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {book.author && <p className="text-[12px] text-neutral-4 truncate">{book.author}</p>}
          <span className="text-[11px] font-semibold text-primary-1 uppercase bg-primary-2 rounded-full px-1.5 py-0.5 shrink-0">
            {book.format}
          </span>
        </div>
        <p className="text-[11px] text-neutral-3 mt-0.5">{book.totalPages} pages</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isAdmin && (
          <button
            onClick={handleDeleteClick}
            className={`text-[13px] font-semibold px-3 py-2 rounded-xl transition-all
              ${confirmDelete
                ? 'bg-red-500 text-white shadow-[0_0_12px_2px_rgba(239,68,68,0.5)]'
                : 'bg-neutral-1 text-neutral-4 active:opacity-70'}`}
          >
            ✕
          </button>
        )}
        <button
          onClick={() => !claimed && onClaim(book)}
          disabled={loading || claimed}
          className={`text-[13px] font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60
            ${claimed ? 'bg-neutral-1 text-neutral-4' : 'bg-primary-1 text-shade-white active:opacity-80'}`}
        >
          {loading ? '…' : claimed ? 'In library' : 'Add'}
        </button>
      </div>
    </div>
  )
}

export default function Upload() {
  const { user } = useAuth()
  const isAdmin = user?.isAdmin === true

  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showCompleteAnim, setShowCompleteAnim] = useState(false)
  const inputRef = useRef()
  const completeTimerRef = useRef(null)

  const [freeFile, setFreeFile] = useState(null)
  const [freeUploading, setFreeUploading] = useState(false)
  const [freeError, setFreeError] = useState('')
  const [freeDone, setFreeDone] = useState(null)

  const [globalBooks, setGlobalBooks] = useState([])
  const [globalLoading, setGlobalLoading] = useState(true)
  const [claimedIds, setClaimedIds] = useState(new Set())
  const [claimingId, setClaimingId] = useState(null)

  useEffect(() => {
    return () => clearTimeout(completeTimerRef.current)
  }, [])

  const fetchGlobalBooks = useCallback(async () => {
    try {
      const [{ data: global }, { data: myBooks }] = await Promise.all([
        api.get('/global-books'),
        api.get('/books'),
      ])
      const books = Array.isArray(global) ? global : []
      const myFilenames = new Set(
        (Array.isArray(myBooks) ? myBooks : (myBooks['hydra:member'] ?? []))
          .map(b => b.originalFilename)
      )
      const alreadyOwned = new Set(
        books.filter(b => myFilenames.has(b.originalFilename)).map(b => b.id)
      )
      setGlobalBooks(books)
      setClaimedIds(alreadyOwned)
    } catch {
      setGlobalBooks([])
    } finally {
      setGlobalLoading(false)
    }
  }, [])

  useEffect(() => { fetchGlobalBooks() }, [fetchGlobalBooks])

  function handleFileSelect(selected) {
    setError('')
    setDone(null)
    if (!selected) return
    const ext = selected.name.split('.').pop().toLowerCase()
    if (!['epub', 'pdf'].includes(ext)) {
      setError('Only EPUB and PDF files are supported.')
      return
    }
    setFile(selected)
  }

  async function handleUpload() {
    if (!file) return
    setError('')
    setUploading(true)
    setShowCompleteAnim(false)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post('/books/upload', form)
      setDone(data)
      setFile(null)
      clearTimeout(completeTimerRef.current)
      setShowCompleteAnim(true)
      completeTimerRef.current = setTimeout(() => setShowCompleteAnim(false), 2300)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  async function handleFreeUpload() {
    if (!freeFile) return
    setFreeError('')
    setFreeUploading(true)
    try {
      const form = new FormData()
      form.append('file', freeFile)
      const { data } = await api.post('/admin/global-books', form)
      setFreeDone(data)
      setFreeFile(null)
      setGlobalBooks(prev => [data, ...prev])
    } catch (err) {
      setFreeError(err.response?.data?.message || err.response?.data?.detail || 'Upload failed.')
    } finally {
      setFreeUploading(false)
    }
  }

  async function handlePushUpload() {
    if (!pushFile) return
    setPushError('')
    setPushUploading(true)
    try {
      const form = new FormData()
      form.append('file', pushFile)
      const { data } = await api.post('/admin/push-book', form)
      setPushDone(data)
      setPushFile(null)
    } catch (err) {
      setPushError(err.response?.data?.message || err.response?.data?.detail || 'Upload failed.')
    } finally {
      setPushUploading(false)
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/admin/global-books/${id}`)
      setGlobalBooks(prev => prev.filter(b => b.id !== id))
    } catch {}
  }

  async function handleClaim(globalBook) {
    setClaimingId(globalBook.id)
    try {
      await api.post(`/global-books/${globalBook.id}/claim`)
      setClaimedIds(prev => new Set([...prev, globalBook.id]))
      clearTimeout(completeTimerRef.current)
      setShowCompleteAnim(true)
      completeTimerRef.current = setTimeout(() => setShowCompleteAnim(false), 2300)
    } catch (err) {
      if (err.response?.status === 409) {
        setClaimedIds(prev => new Set([...prev, globalBook.id]))
      }
    } finally {
      setClaimingId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      {showCompleteAnim && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 rsvp-fade-in" aria-hidden />
          <div className="relative w-full max-w-[430px] h-full px-5 py-6">
            <div
              className="h-full rounded-[44px] rsvp-fade-in flex flex-col items-center justify-center text-center"
              style={{ background: 'var(--rsvp-upload-complete-bg)' }}
              role="status"
              aria-live="polite"
            >
              <div className="w-24 h-24 rounded-full bg-shade-white grid place-items-center rsvp-pop-in">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="text-primary-1 rsvp-check-draw" aria-hidden>
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="mt-8 text-shade-white text-[22px] font-medium">Uploading completed</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pt-14 pb-6">
        <h1 className="text-[26px] font-bold text-neutral-8 leading-tight">
          <span className="text-primary-1">Upload</span> new documents
        </h1>
      </div>

      <div className="px-6 flex flex-col gap-6">
        {/* Personal drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !file && inputRef.current?.click()}
          className={`rounded-3xl border-2 border-dashed p-10 flex flex-col items-center gap-3 transition-colors cursor-pointer shadow-card-lg
            ${dragOver ? 'border-primary-1 bg-neutral-2' : 'border-primary-2 bg-shade-white'}
            ${file ? 'cursor-default' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".epub,.pdf"
            className="hidden"
            onChange={e => handleFileSelect(e.target.files[0])}
          />

          {file ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-neutral-1 flex items-center justify-center">
                <FileIcon className="text-primary-1" />
              </div>
              <p className="text-neutral-8 font-semibold text-[15px] text-center">{file.name}</p>
              <p className="text-neutral-4 text-sm">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={e => { e.stopPropagation(); setFile(null) }}
                  className="text-sm text-neutral-4 px-4 py-2 rounded-xl border border-neutral-2"
                >
                  Remove
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleUpload() }}
                  disabled={uploading}
                  className="text-sm text-shade-white bg-primary-1 px-4 py-2 rounded-xl disabled:opacity-60 font-semibold"
                >
                  {uploading ? 'Uploading…' : 'Upload file'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-neutral-1 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-neutral-5">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-[15px] text-neutral-6 text-center">
                <span className="text-primary-1 font-semibold">Click to select</span> a file
              </p>
              <button
                onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                className="bg-primary-1 text-shade-white text-[14px] font-semibold rounded-full px-6 py-2.5 active:opacity-80 transition-opacity"
              >
                Select file
              </button>
              <p className="text-neutral-4 text-xs">EPUB or PDF supported</p>
            </>
          )}
        </div>

        {error && (
          <div className="bg-error-1 text-error-2 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {done && (
          <div>
            <h2 className="text-[20px] font-bold text-neutral-8 mb-3">Uploading complete</h2>
            <div className="bg-shade-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-card">
              <div className="w-11 h-11 rounded-xl bg-neutral-1 flex items-center justify-center shrink-0">
                <FileIcon className="text-neutral-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[14px] font-medium text-neutral-8 truncate">{done.title}</p>
                <p className="text-[12px] text-neutral-4 mt-0.5">Completed</p>
                <div className="mt-2 h-1.5 bg-neutral-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-1 rounded-full w-full" />
                </div>
              </div>
              <span className="text-[13px] font-semibold text-neutral-6 ml-2">100%</span>
            </div>
          </div>
        )}

        {!done && !file && (
          <p className="text-center text-neutral-4 text-sm py-4">
            Feeling like something new?{' '}
            <button onClick={() => inputRef.current?.click()} className="text-primary-1 font-semibold">
              Start uploading
            </button>{' '}
            your files
          </p>
        )}

        {/* Admin: add to free section */}
        {isAdmin && (
          <AdminUploadCard
            title="Add to free section"
            description="Adds this book to the 'Try these free books' list below. Users can choose to add it to their own library."
            accentClass="border-primary-2 bg-shade-white"
            file={freeFile}
            onFileSelect={f => { setFreeError(''); setFreeDone(null); const ext = f?.name.split('.').pop().toLowerCase(); if (!['epub','pdf'].includes(ext)) { setFreeError('Only EPUB and PDF.'); return; } setFreeFile(f) }}
            onClear={() => { setFreeFile(null); setFreeError(''); setFreeDone(null) }}
            onUpload={handleFreeUpload}
            uploading={freeUploading}
            error={freeError}
            buttonLabel="Add to free section"
            done={freeDone ? `"${freeDone.title}" added to free section.` : null}
          />
        )}

        {/* Free books list */}
        {(globalLoading || globalBooks.length > 0) && (
          <div>
            <h2 className="text-[20px] font-bold text-neutral-8 mb-3">Try these free books</h2>

            {globalLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="bg-shade-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-card animate-pulse">
                    <div className="w-11 h-11 rounded-xl bg-neutral-2 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-neutral-2 rounded w-3/4" />
                      <div className="h-2.5 bg-neutral-2 rounded w-1/2" />
                    </div>
                    <div className="w-16 h-8 bg-neutral-2 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {globalBooks.map(book => (
                  <GlobalBookRow
                    key={book.id}
                    book={book}
                    claimed={claimedIds.has(book.id)}
                    loading={claimingId === book.id}
                    onClaim={handleClaim}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
