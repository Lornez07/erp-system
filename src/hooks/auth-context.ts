import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type Role = 'admin' | 'sales' | 'purchasing' | 'viewer'

export interface Profile {
  role: Role
  full_name: string
}

export interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

// colocated in the context module so fast-refresh keeps useAuth.tsx
// component-only (react/only-export-components)
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
