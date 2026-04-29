import { createContext, useContext, useState, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

function clearUserStorage() {
  localStorage.removeItem('badges')
  localStorage.removeItem('readingStats')
}

async function loadBadgesFromServer(userId) {
  try {
    const { data } = await api.get(`/users/${userId}/badges`)
    const badges = (Array.isArray(data) ? data : (data['hydra:member'] ?? []))
      .map(b => ({ id: b.badgeId ?? b.id, earnedAt: b.earnedAt }))
    localStorage.setItem('badges', JSON.stringify(badges))
  } catch {
    localStorage.setItem('badges', '[]')
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/login', { username, password })
    clearUserStorage()
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    await loadBadgesFromServer(data.user.id)
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (name, password) => {
    const { data } = await api.post('/register', { name, password })
    clearUserStorage()
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.setItem('badges', '[]')
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    clearUserStorage()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const updateUser = useCallback((patch) => {
    setUser(prev => {
      const next = { ...prev, ...patch }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
