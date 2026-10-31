import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { AuthContext } from './auth-context'
import type { Profile } from './auth-context'

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Wrong email or password.'
  if (message.includes('Email not confirmed')) return 'This account was not confirmed. Ask the admin.'
  return 'Sign-in failed. Try again — if it persists, ask the admin.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch((err: unknown) => {
        console.error('session restore failed', err)
      })
      .finally(() => setLoading(false))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let alive = true
    async function loadProfile() {
      if (!session) {
        setProfile(null)
        return
      }
      // fail safe: least privilege on any error
      const fallback: Profile = { role: 'viewer', full_name: '' }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single()
        if (!alive) return
        if (error || !data) {
          console.error('profile load failed', error)
          setProfile(fallback)
        } else {
          setProfile(data as Profile)
        }
      } catch (err) {
        console.error('profile load failed', err)
        if (alive) setProfile(fallback)
      }
    }
    void loadProfile()
    return () => {
      alive = false
    }
  }, [session])

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) return null
    return mapAuthError(error.message)
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
