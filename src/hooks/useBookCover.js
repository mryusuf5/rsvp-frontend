import { useState, useEffect } from 'react'

const cache = new Map()

/**
 * Fetches a book cover URL from Open Library using title + author.
 * Results are cached in a module-level Map so repeated calls are free.
 *
 * @param {string} title
 * @param {string|null} author
 * @param {boolean} enabled  pass false to skip the fetch (e.g. for PDFs)
 * @returns {{ url: string|null, status: 'disabled'|'idle'|'loading'|'success'|'not_found'|'error' }}
 */
export function useBookCover(title, author, enabled = true) {
  const key = `${title}||${author ?? ''}`

  const [state, setState] = useState(() => {
    if (!enabled) return { url: null, status: 'disabled' }
    if (!title) return { url: null, status: 'idle' }
    if (cache.has(key)) {
      const cached = cache.get(key)
      return { url: cached, status: cached ? 'success' : 'not_found' }
    }
    return { url: null, status: 'loading' }
  })

  useEffect(() => {
    if (!enabled) {
      setState({ url: null, status: 'disabled' })
      return
    }

    if (!title) {
      setState({ url: null, status: 'idle' })
      return
    }

    if (cache.has(key)) {
      const cached = cache.get(key)
      setState({ url: cached, status: cached ? 'success' : 'not_found' })
      return
    }

    setState({ url: null, status: 'loading' })

    let cancelled = false

    async function load() {
      try {
        let q = `title=${encodeURIComponent(title)}`
        if (author) q += `&author=${encodeURIComponent(author)}`

        const res = await fetch(
          `https://openlibrary.org/search.json?${q}&limit=1&fields=cover_i`,
        )
        const data = await res.json()
        const coverId = data.docs?.[0]?.cover_i
        const result = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
          : null

        cache.set(key, result)
        if (!cancelled) setState({ url: result, status: result ? 'success' : 'not_found' })
      } catch {
        cache.set(key, null)
        if (!cancelled) setState({ url: null, status: 'error' })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [key, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return state
}
