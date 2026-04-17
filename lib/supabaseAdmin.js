import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service_role (acceso total, sin RLS).
 * SOLO usar en API routes / Server Actions.
 * NUNCA importar en componentes cliente.
 */
export function getSupabaseAdmin() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !service) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(url, service, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })
}
