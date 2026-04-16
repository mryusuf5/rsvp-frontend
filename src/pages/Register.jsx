import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, password)
      navigate('/')
    } catch (err) {
      const violations = err.response?.data?.violations
      if (violations?.length) {
        setError(violations.map(v => v.message).join('. '))
      } else {
        setError(err.response?.data?.message || err.response?.data?.detail || 'Registration failed')
      }
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
            Create your<br />account
          </h1>
          <p className="text-neutral-5 mt-2 text-sm">Start reading faster today</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-neutral-6 uppercase tracking-wider mb-1.5 block">
              Username
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Choose a username"
              required
              minLength={2}
              maxLength={180}
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
              placeholder="Min. 8 characters"
              required
              minLength={8}
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-neutral-5 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-1 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
