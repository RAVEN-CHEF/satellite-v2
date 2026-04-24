import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { sanitize } from '@/utils/validation'

export async function POST(req) {
  let body
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 }) }

  const { token, nombre, firma_base64 } = body
  if (!token)        return NextResponse.json({ ok: false, error: 'Token requerido' }, { status: 400 })
  if (!nombre?.trim()) return NextResponse.json({ ok: false, error: 'Nombre requerido' }, { status: 400 })
  if (!firma_base64)   return NextResponse.json({ ok: false, error: 'Firma requerida' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Buscar link
  const { data: link, error: findErr } = await admin
    .from('validation_links')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (findErr || !link) return NextResponse.json({ ok: false, error: 'Link no encontrado' }, { status: 404 })
  if (link.used)        return NextResponse.json({ ok: false, error: 'Este link ya fue utilizado' }, { status: 410 })
  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, error: 'Link expirado' }, { status: 410 })
  }

  // Marcar como usado y guardar firma
  const { error: updateErr } = await admin
    .from('validation_links')
    .update({
      used:        true,
      signed_by:   sanitize(nombre),
      signed_at:   new Date().toISOString(),
      firma_image: firma_base64,
    })
    .eq('token', token)

  if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, message: 'Documento firmado correctamente' })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ ok: false, error: 'Token requerido' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data: link, error } = await admin
    .from('validation_links')
    .select('titulo,descripcion,contenido,used,expires_at,signed_by,signed_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !link) return NextResponse.json({ ok: false, error: 'Link no encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true, link })
}
