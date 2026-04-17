import { createBrowserClient } from '@supabase/ssr'

let _client = null

/**
 * Singleton del cliente Supabase para el navegador.
 * Usar SOLO en componentes 'use client'.
 */
export function getSupabase() {
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  return _client
}

// Export directo para uso rápido
export const supabase = getSupabase()
