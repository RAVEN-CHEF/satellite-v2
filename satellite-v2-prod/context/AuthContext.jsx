'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(undefined) // undefined = loading
  const [ready, setReady] = useState(false)

  const loadProfile = useCallback(async (authUser) => {
    if (!authUser) { setUser(null); setReady(true); return }

    const ravenEmail = process.env.NEXT_PUBLIC_RAVEN_EMAIL
    if (authUser.email === ravenEmail) {
      setUser({ id: authUser.id, email: authUser.email, role: 'raven', nombre: 'RAVEN', permisos: null })
      setReady(true)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, permisos, nombre, activo')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profile?.activo === false) {
      await supabase.auth.signOut()
      setUser(null)
      setReady(true)
      return
    }

    setUser({
      id:       authUser.id,
      email:    authUser.email,
      role:     profile?.role     ?? 'empleado',
      nombre:   profile?.nombre   ?? authUser.email,
      permisos: profile?.permisos ?? {},
      activo:   profile?.activo   ?? true,
    })
    setReady(true)
  }, [])

  useEffect(() => {
    // Carga inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadProfile(session?.user ?? null)
    })

    // Listener de cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ user, ready, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
