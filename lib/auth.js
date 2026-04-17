import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll:  () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function getAuthUser() {
  const supabase = createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const ravenEmail = process.env.RAVEN_EMAIL
  if (user.email === ravenEmail) {
    return { id: user.id, email: user.email, role: 'raven', nombre: 'RAVEN', permisos: null, activo: true }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permisos, nombre, activo')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.activo === false) {
    await supabase.auth.signOut()
    return null
  }

  return {
    id:       user.id,
    email:    user.email,
    role:     profile?.role     ?? 'empleado',
    nombre:   profile?.nombre   ?? user.email,
    permisos: profile?.permisos ?? {},
    activo:   profile?.activo   ?? true,
  }
}

export async function requireAdmin() {
  const user = await getAuthUser()
  if (!user) return { user: null, error: 'No autenticado', status: 401 }
  if (user.role !== 'admin' && user.role !== 'raven') {
    return { user: null, error: 'Acceso denegado', status: 403 }
  }
  return { user, error: null, status: 200 }
}

export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) return { user: null, error: 'No autenticado', status: 401 }
  return { user, error: null, status: 200 }
}
