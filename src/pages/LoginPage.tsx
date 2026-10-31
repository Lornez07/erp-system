import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '../hooks/auth-context'
import { ModuleHeader } from '../components/ModuleHeader'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const err = await signIn(email.trim(), password)
      if (err) {
        setError(err)
      } else {
        navigate('/', { replace: true })
      }
    } catch {
      setError('Sign-in failed. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <ModuleHeader code="core / auth" title="Sign in" />
      <p className="mb-6 text-sm text-muted">
        Accounts are created by the admin. There is no public sign-up.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-line bg-surface px-3 py-2 text-sm"
            style={{ borderRadius: 'var(--radius-card)' }}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block font-mono text-xs uppercase tracking-widest text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-line bg-surface px-3 py-2 text-sm"
            style={{ borderRadius: 'var(--radius-card)' }}
          />
        </div>
        {error && (
          <p className="border border-line px-3 py-2 text-sm text-danger" style={{ borderRadius: 'var(--radius-card)' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ borderRadius: 'var(--radius-card)', backgroundColor: 'var(--color-accent)' }}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
