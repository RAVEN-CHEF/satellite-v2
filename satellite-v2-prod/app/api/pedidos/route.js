import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req) {
  const { user, error, status } = await requireAdmin()
  if (error) return NextResponse.json({ ok: false, error }, { status })

  const admin = getSupabaseAdmin()
  const { data, error: dbErr } = await admin
    .from('pedidos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, pedidos: data })
}

export async function POST(req) {
  const { user, error, status } = await requireAdmin()
  if (error) return NextResponse.json({ ok: false, error }, { status })

  let body
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 }) }

  const { items, notas } = body
  if (!items?.length) return NextResponse.json({ ok: false, error: 'Items requeridos' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error: dbErr } = await admin
    .from('pedidos')
    .insert({ items, notas: notas || null, created_by: user.id })
    .select('id')
    .single()

  if (dbErr) return NextResponse.json({ ok: false, error: dbErr.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
