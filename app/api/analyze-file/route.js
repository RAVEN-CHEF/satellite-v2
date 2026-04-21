import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { geminiJSON } from '@/lib/gemini'

export const maxDuration = 60

// Tipos de análisis soportados
const PROMPTS = {
  receta: `Analiza este documento/imagen y extrae la información de la receta.
Devuelve JSON con este formato exacto:
{
  "nombre": "NOMBRE EN MAYÚSCULAS",
  "categoria": "categoría del platillo",
  "descripcion": "descripción breve",
  "tiempo": "X MIN",
  "procedimiento": "pasos de preparación",
  "ingredientes": [{ "n": "nombre ingrediente", "c": "cantidad", "u": "unidad" }]
}
Si no encuentras algún campo, usa string vacío. Ingredientes siempre como array aunque esté vacío.`,

  subreceta: `Analiza este documento/imagen y extrae la información de la sub-receta o salsa.
Devuelve JSON:
{
  "nombre": "NOMBRE",
  "tiempo": "X MIN",
  "procedimiento": "pasos",
  "ingredientes": [{ "n": "nombre", "c": "cantidad", "u": "unidad" }]
}`,

  merma: `Analiza este documento/imagen y extrae información de mermas/pérdidas de ingredientes.
Devuelve JSON:
{
  "fecha": "YYYY-MM-DD o vacío",
  "items": [{ "ingrediente": "nombre", "cantidad": número, "unidad": "kg/g/L/etc", "motivo": "descripción", "responsable": "nombre o vacío" }]
}`,

  cortesia: `Analiza este documento/imagen y extrae información de cortesías/consumos internos.
Devuelve JSON:
{
  "fecha": "YYYY-MM-DD o vacío",
  "items": [{ "platillo": "nombre", "cantidad": número, "motivo": "descripción", "autorizado_por": "nombre o vacío" }]
}`,

  inventario: `Analiza este documento/imagen y extrae el inventario de ingredientes/productos.
Devuelve JSON:
{
  "items": [{ "ingrediente": "nombre", "stock": número, "unit": "kg/g/L/ml/unidad", "notas": "" }]
}`,
}

export async function POST(req) {
  const { user, error, status } = await requireAuth()
  if (error) return NextResponse.json({ ok: false, error }, { status })

  try {
    const formData = await req.formData()
    const file     = formData.get('file')
    const tipo     = formData.get('tipo') || 'receta'

    if (!file) return NextResponse.json({ ok: false, error: 'No se recibió archivo' }, { status: 400 })

    const mimeType = file.type
    const allowed  = ['image/jpeg','image/png','image/webp','application/pdf',
                       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                       'application/vnd.ms-excel','text/csv']

    if (!allowed.includes(mimeType)) {
      return NextResponse.json({ ok: false, error: 'Formato no soportado. Use imagen, PDF o Excel.' }, { status: 400 })
    }

    const buffer     = await file.arrayBuffer()
    const base64Data = Buffer.from(buffer).toString('base64')
    const prompt     = PROMPTS[tipo] || PROMPTS.receta

    // Excel/CSV: convertir a texto antes de enviar
    let finalMime = mimeType
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
      finalMime = 'application/pdf' // Gemini trata xlsx como documento
    }

    const result = await geminiJSON({ prompt, base64Data, mimeType: finalMime })
    return NextResponse.json({ ok: true, tipo, data: result })

  } catch (err) {
    console.error('[analyze-file]', err.message)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
