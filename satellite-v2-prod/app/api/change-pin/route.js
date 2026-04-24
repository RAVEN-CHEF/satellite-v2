import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sanitize, isValidPin, usernameToEmail, apiError, apiOk } from '@/utils/validation'

export async function POST(req) {
  const { user: caller, error: authErr, status: authStatus } = await requireAdmin()
  if (authErr) return NextResponse.json({ ok: false, error: authErr }, { status: authStatus })

  let body
  try { body = await req.json() }
  catch { return apiError('Body JSON inválido') }

  const username = sanitize(body.username ?? '')
  const newPin   = String(body.newPin ?? '')

  if (!username)          return apiError('Usuario obligatorio')
  if (!isValidPin(newPin)) return apiError('PIN debe ser 6 dígitos numéricos')

  const email = usernameToEmail(username)
  const admin = getSupabaseAdmin()

  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) return apiError(listErr.message, 500)

  const target = users.find(u => u.email === email)
  if (!target) return apiError('Usuario no encontrado', 404)

  const { error: updateErr } = await admin.auth.admin.updateUserById(target.id, {
    password: newPin,
  })
  if (updateErr) return apiError(updateErr.message, 500)

  return apiOk()
}
