// ─────────────────────────────────────────────
// VALIDATION UTILITIES  ·  utils/validation.js
// ─────────────────────────────────────────────

/** Sanitiza un string: elimina HTML y recorta espacios */
export function sanitize(str) {
  if (typeof str !== 'string') return ''
  return str
    .replace(/[<>'"]/g, '')
    .trim()
}

/** Valida email */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase())
}

/** Valida PIN numérico de 6 dígitos */
export function isValidPin(pin) {
  return /^\d{6}$/.test(String(pin))
}

/** Valida username: solo letras, números, guiones y puntos */
export function isValidUsername(username) {
  return /^[a-zA-Z0-9._-]{2,40}$/.test(String(username))
}

/** Convierte username a email interno del sistema */
export function usernameToEmail(username) {
  return `${sanitize(username).toLowerCase().replace(/\s+/g, '')}@satellite.onomura`
}

/** Respuesta de error estándar para API routes */
export function apiError(message, status = 400) {
  return Response.json({ ok: false, error: message }, { status })
}

/** Respuesta de éxito estándar para API routes */
export function apiOk(data = {}) {
  return Response.json({ ok: true, ...data })
}
