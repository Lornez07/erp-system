import { Navigate, Outlet } from 'react-router'
import { useAuth, type Role } from '../hooks/auth-context'

/**
 * Route guard: session required; optional role whitelist.
 * UI hides disallowed actions, but RLS is the real enforcement.
 */
export function RequireRole({ allow }: { allow?: Role[] }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Loading session…
        </p>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (allow && profile && !allow.includes(profile.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-8">
        <div className="border border-danger px-4 py-3 text-sm" style={{ borderRadius: 'var(--radius-card)' }}>
          Access denied — your role ({profile.role}) cannot open this module.
        </div>
        <p className="text-xs text-muted">Check with the admin if this is wrong.</p>
      </div>
    )
  }

  return <Outlet />
}
