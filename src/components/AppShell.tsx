import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../hooks/auth-context'

const NAV = [
  { to: '/', label: 'Dashboard', code: 'DASH' },
  { to: '/inventory', label: 'Inventory', code: 'INV' },
  { to: '/sales', label: 'Sales', code: 'SLS' },
  { to: '/purchasing', label: 'Purchasing', code: 'PCH' },
]

function navLinkClass(isActive: boolean): string {
  return isActive
    ? 'block border border-line bg-accent-soft px-3 py-2 text-sm font-medium text-accent'
    : 'block border border-transparent px-3 py-2 text-sm text-ink hover:bg-accent-soft'
}

/** Role-based visibility arrives with Tasks 5-8; all signed-in users see structure now. */
export function AppShell() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-bg">
      {/* sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface md:flex">
        <div className="border-b border-line px-4 py-4">
          <p className="font-mono text-xs uppercase tracking-widest">Demo Trade Co</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
            ERP · demo build
          </p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => navLinkClass(isActive)}>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{item.code}</span>
              <span className="ml-2">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-4 py-3">
          <p className="text-xs text-muted">
            {profile?.full_name || 'Signed in'} · <span className="font-mono uppercase">{profile?.role}</span>
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-1 text-xs text-accent underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* mobile top bar — replaces the sidebar's header + user chip */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-line bg-surface px-3 py-2 md:hidden">
        <p className="font-mono text-xs uppercase tracking-widest">Demo Trade Co</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {profile?.full_name || 'Signed in'} · <span className="font-mono uppercase">{profile?.role}</span>
          </span>
          <button
            type="button"
            onClick={signOut}
            className="border border-line bg-surface px-2 py-1 text-xs text-accent underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* main content — full-bleed for dense tables, offset by sidebar on desktop */}
      <div className="md:pl-60">
        <main className="mx-auto px-4 pb-24 pt-14 md:px-8 md:pb-10 md:pt-6" style={{ maxWidth: 1280 }}>
          <Outlet />
        </main>
      </div>

      {/* bottom nav — mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              isActive
                ? 'flex-1 border-t-2 border-accent py-2 text-center'
                : 'flex-1 border-t-2 border-transparent py-2 text-center'
            }
          >
            <span className="block font-mono text-[10px] uppercase tracking-widest">{item.code}</span>
            <span className="block text-[10px] text-muted">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
