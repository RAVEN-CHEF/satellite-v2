import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sanitize, isValidEmail, apiError, apiOk } from '@/utils/validation'
import { SECCIONES } from '@/lib/permissions'

export async function POST(req) {
  const { user: caller, error: authErr, status: authStatus } = await requireAdmin()
  if (authErr) return NextResponse.json({ ok: false, error: authErr }, { status: authStatus })

  let body
  try { body = await req.json() }
  catch { return apiError('Body JSON inválido') }

  const email    = sanitize(body.email ?? '')
  const nombre   = sanitize(body.nombre ?? '')
  const password = String(body.password ?? '')
  const role     = ['admin', 'empleado'].includes(body.role) ? body.role : 'empleado'
  const permisos = typeof body.permisos === 'object' && !Array.isArray(body.permisos)
    ? body.permisos : {}

  if (!isValidEmail(email))  return apiError('Email inválido')
  if (!nombre)                return apiError('Nombre obligatorio')
  if (password.length < 6)   return apiError('Contraseña mínimo 6 caracteres')

  const permisosClean = {}
  for (const [sec, nivel] of Object.entries(permisos)) {
    const def = SECCIONES[sec]
    if (def && def.niveles.includes(nivel)) permisosClean[sec] = nivel
  }

  const admin = getSupabaseAdmin()
  const { data, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, role },
  })
  if (createErr) return apiError(createErr.message, 400)

  const { error: profileErr } = await admin.from('profiles').upsert({
    id: data.user.id, email, nombre, role, permisos: permisosClean, activo: true,
  })

  if (profileErr) {
    await admin.auth.admin.deleteUser(data.user.id)
    return apiError(profileErr.message, 500)
  }

  return apiOk({ userId: data.user.id })
}
