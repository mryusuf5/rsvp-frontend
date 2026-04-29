import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bookCoversV2'
const cache = new Map()

// Hydrate in-memory cache from localStorage on module load
try {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  for (const [k, v] of Object.entries(stored)) {
    cache.set(k, v)
  }
} catch {}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(cache)))
  } catch {}
}

function cacheSet(key, value) {
  cache.set(key, value)
  persist()
}

/**
 * Fetches cover URL, genre, and publish year from Open Library.
 * Results are cached in memory and persisted to localStorage across sessions.
 */
export function useBookCover(title, author, enabled = true) {
  const key = `${title}||${author ?? ''}`

  const [state, setState] = useState(() => {
    if (!enabled) return { url: null, genre: null, year: null, status: 'disabled' }
    if (!title) return { url: null, genre: null, year: null, status: 'idle' }
    if (cache.has(key)) {
      const c = cache.get(key)
      return { url: c.url, genre: c.genre, year: c.year, status: c.url ? 'success' : 'not_found' }
    }
    return { url: null, genre: null, year: null, status: 'loading' }
  })

  useEffect(() => {
    if (!enabled) {
      setState({ url: null, genre: null, year: null, status: 'disabled' })
      return
    }

    if (!title) {
      setState({ url: null, genre: null, year: null, status: 'idle' })
      return
    }

    if (cache.has(key)) {
      const c = cache.get(key)
      setState({ url: c.url, genre: c.genre, year: c.year, status: c.url ? 'success' : 'not_found' })
      return
    }

    setState({ url: null, genre: null, year: null, status: 'loading' })

    let cancelled = false

    async function load() {
      try {
        let q = `title=${encodeURIComponent(title)}`
        if (author) q += `&author=${encodeURIComponent(author)}`

        const res = await fetch(
          `https://openlibrary.org/search.json?${q}&limit=1&fields=cover_i,subject,first_publish_year`,
        )
        const data = await res.json()
        const doc = data.docs?.[0]
        const coverId = doc?.cover_i
        const url = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null
        const genre = doc?.subject?.[0] ?? null
        const year = doc?.first_publish_year ?? null

        const entry = { url, genre, year }
        cacheSet(key, entry)
        if (!cancelled) setState({ url, genre, year, status: url ? 'success' : 'not_found' })
      } catch {
        const entry = { url: null, genre: null, year: null }
        cacheSet(key, entry)
        if (!cancelled) setState({ url: null, genre: null, year: null, status: 'error' })
      }
    }

    load()
    return () => { cancelled = true }
  }, [key, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}
