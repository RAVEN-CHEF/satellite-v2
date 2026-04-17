import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sanitize, apiError, apiOk } from '@/utils/validation'
import { SECCIONES } from '@/lib/permissions'

export async function PATCH(req) {
  const { user: caller, error: authErr, status: authStatus } = await requireAdmin()
  if (authErr) return NextResponse.json({ ok: false, error: authErr }, { status: authStatus })

  let body
  try { body = await req.json() }
  catch { return apiError('Body JSON inválido') }

  const { id, nombre, role, permisos, activo } = body
  if (!id) return apiError('ID obligatorio')

  const allowedRoles = ['admin', 'empleado']
  const safeRole     = allowedRoles.includes(role) ? role : undefined

  const permisosClean = {}
  if (permisos && typeof permisos === 'object') {
    for (const [sec, nivel] of Object.entries(permisos)) {
      const def = SECCIONES[sec]
      if (def && def.niveles.includes(nivel)) permisosClean[sec] = nivel
    }
  }

  const updates = {}
  if (nombre !== undefined)           updates.nombre   = sanitize(nombre)
  if (safeRole !== undefined)         updates.role     = safeRole
  if (permisos !== undefined)         updates.permisos = permisosClean
  if (typeof activo === 'boolean')    updates.activo   = activo

  const admin = getSupabaseAdmin()
  const { error: updateErr } = await admin.from('profiles').update(updates).eq('id', id)
  if (updateErr) return apiError(updateErr.message, 500)

  return apiOk()
}
