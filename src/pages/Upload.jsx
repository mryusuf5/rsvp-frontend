import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import BottomNav from '../components/BottomNav'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showCompleteAnim, setShowCompleteAnim] = useState(false)
  const inputRef = useRef()
  const completeTimerRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    return () => clearTimeout(completeTimerRef.current)
  }, [])

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
      completeTimerRef.current = setTimeout(() => {
        setShowCompleteAnim(false)
      }, 2300)
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

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      {/* Upload complete animation overlay */}
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
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-primary-1 rsvp-check-draw"
                  aria-hidden
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-8 text-shade-white text-[22px] font-medium">Uploading completed</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-14 pb-6">
        <div className="flex items-start justify-between">
          <h1 className="text-[26px] font-bold text-neutral-8 leading-tight">
            <span className="text-primary-1">Upload</span> new<br />documents
          </h1>
          <div className="flex gap-3 mt-1">
            <button onClick={() => navigate('/account')} className="w-12 h-12 rounded-full bg-shade-white shadow-card flex items-center justify-center active:opacity-70">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-neutral-6">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.7"/>
                <circle cx="12" cy="9.5" r="2.8" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M6.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </button>
            <button onClick={() => navigate('/search')} className="w-12 h-12 rounded-full bg-shade-white shadow-card flex items-center justify-center active:opacity-70">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-neutral-6">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7"/>
                <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 flex flex-col gap-6">
        {/* Drop Zone */}
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary-1">
                  <path d="M4 19V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                    stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
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

        {/* Error */}
        {error && (
          <div className="bg-error-1 text-error-2 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Upload complete */}
        {done && (
          <div>
            <h2 className="text-[20px] font-bold text-neutral-8 mb-3">Uploading complete</h2>
            <div className="bg-shade-white rounded-2xl px-4 py-4 flex items-center gap-3 shadow-card">
              <div className="w-11 h-11 rounded-xl bg-neutral-1 flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-neutral-5">
                  <path d="M4 19V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
                    stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                </svg>
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
      </div>

      <BottomNav />
    </div>
  )
}
