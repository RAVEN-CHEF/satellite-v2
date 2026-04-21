// ─────────────────────────────────────────────
// GEMINI VISION  ·  lib/gemini.js
// Analiza imágenes, PDFs y texto con Gemini Flash
// SOLO usar en API routes (servidor)
// ─────────────────────────────────────────────

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

/**
 * Llama a Gemini con texto y/o archivo en base64
 * @param {object} opts
 * @param {string} opts.prompt        - Instrucción al modelo
 * @param {string} [opts.base64Data]  - Archivo en base64
 * @param {string} [opts.mimeType]    - MIME type del archivo
 * @returns {Promise<string>}         - Texto de respuesta
 */
export async function geminiCall({ prompt, base64Data, mimeType }) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY no configurada')

  const parts = [{ text: prompt }]
  if (base64Data && mimeType) {
    parts.unshift({ inline_data: { mime_type: mimeType, data: base64Data } })
  }

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini HTTP ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return text
}

/**
 * Extrae JSON de la respuesta de Gemini
 */
export async function geminiJSON(opts) {
  const raw = await geminiCall(opts)
  const clean = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const match = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (!match) throw new Error(`Gemini no devolvió JSON válido: ${raw.slice(0, 200)}`)
  return JSON.parse(match[0])
}
