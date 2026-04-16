import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-neutral-1 px-6">
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-10">
          <div className="w-12 h-12 rounded-2xl bg-primary-1 flex items-center justify-center mb-6">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-shade-white">
              <path d="M12 3L4 7v10l8 4 8-4V7L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M12 3v18M4 7l8 4 8-4" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-8 leading-tight">
            Welcome<br />back
          </h1>
          <p className="text-neutral-5 mt-2 text-sm">Sign in to continue reading</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-neutral-6 uppercase tracking-wider mb-1.5 block">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your username"
              required
              className="w-full bg-shade-white rounded-2xl px-4 py-3.5 text-neutral-8 placeholder-neutral-4 border border-neutral-2 focus:outline-none focus:border-primary-1 transition-colors text-[15px]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-neutral-6 uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your password"
              required
              className="w-full bg-shade-white rounded-2xl px-4 py-3.5 text-neutral-8 placeholder-neutral-4 border border-neutral-2 focus:outline-none focus:border-primary-1 transition-colors text-[15px]"
            />
          </div>

          {error && (
            <div className="bg-error-1 text-error-2 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-primary-1 text-shade-white font-semibold rounded-2xl py-4 mt-2 active:opacity-80 transition-opacity disabled:opacity-60 text-[15px]"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-neutral-5 text-sm mt-6">
          No account?{' '}
          <Link to="/register" className="text-primary-1 font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
