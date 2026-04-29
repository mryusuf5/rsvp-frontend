const KEY = 'wishlist'

export function getWishlist() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function addToWishlist(item) {
  const list = getWishlist()
  const key = `${item.title}||${item.author ?? ''}`
  if (list.some(x => x.key === key)) return false
  list.unshift({ ...item, key, addedAt: new Date().toISOString() })
  localStorage.setItem(KEY, JSON.stringify(list))
  return true
}

export function removeFromWishlist(key) {
  const list = getWishlist().filter(x => x.key !== key)
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function isInWishlist(title, author) {
  const key = `${title}||${author ?? ''}`
  return getWishlist().some(x => x.key === key)
}
