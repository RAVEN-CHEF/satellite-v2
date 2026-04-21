import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req) {
  const { user, error, status } = await requireAdmin()
  if (error) return NextResponse.json({ ok: false, error }, { status })

  // Solo RAVEN puede generar links
  if (user.role !== 'raven') {
    return NextResponse.json({ ok: false, error: 'Solo RAVEN puede generar links de validación' }, { status: 403 })
  }

  let body
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 }) }

  const { titulo, descripcion, contenido, horas_expira = 72 } = body
  if (!titulo?.trim()) return NextResponse.json({ ok: false, error: 'Título obligatorio' }, { status: 400 })

  const admin      = getSupabaseAdmin()
  const expires_at = new Date(Date.now() + horas_expira * 3600000).toISOString()

  const { data, error: dbErr } = await admin
    .from('validation_links')
    .insert({
      titulo:      titulo.trim(),
      descripcion: descripcion?.trim() || null,
      contenido:   contenido || null,
      expires_at,
      created_by:  user.id,
      used:        false,
      signed_by:   null,
      signed_at:   null,
    })
    .select('token')
    .single()

  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 })

  const url = `${process.env.NEXT_PUBLIC_APP_URL || ''}/validar/${data.token}`
  return NextResponse.json({ ok: true, token: data.token, url })
}
