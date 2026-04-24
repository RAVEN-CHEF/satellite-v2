// ─────────────────────────────────────────────────────────────────────────────
// PERMISOS Y ROLES  ·  lib/permissions.js
// Única fuente de verdad para roles, secciones y checks de acceso.
// ─────────────────────────────────────────────────────────────────────────────

/** Rol que tiene acceso total al sistema */
export const ROLES = {
  RAVEN:    'raven',
  ADMIN:    'admin',
  EMPLEADO: 'empleado',
}

/**
 * Secciones del sistema con sus niveles de permiso disponibles.
 * 'ver' es el mínimo; los superiores incluyen el acceso de 'ver'.
 */
export const SECCIONES = {
  recetas:     { label: 'Recetario',       niveles: ['ver', 'editar'] },
  recetas_sub: { label: 'Sub-recetas',     niveles: ['ver'] },
  horarios:    { label: 'Horarios',        niveles: ['ver', 'editar'] },
  reportes:    { label: 'Reportes',        niveles: ['ver', 'descargar'] },
  inventario:  { label: 'Inventario',      niveles: ['ver', 'editar'] },
  checkin:     { label: 'Check-in',        niveles: ['ver'] },
  firmas:      { label: 'Firmas',          niveles: ['ver'] },
  admin:       { label: 'Administración',  niveles: ['ver'] },
}

// ─── Detección de rol ─────────────────────────────────────────────────────────

export function isRaven(user) {
  if (!user) return false
  return user.role === ROLES.RAVEN
}

export function isAdmin(user) {
  if (!user) return false
  return user.role === ROLES.ADMIN || isRaven(user)
}

export function detectRole(user) {
  if (!user) return null
  return user.role ?? ROLES.EMPLEADO
}

// ─── Checks de permiso ────────────────────────────────────────────────────────

/** ¿Puede el usuario ver la sección? */
export function canView(user, seccion) {
  if (!user) return false
  if (isRaven(user)) return true
  if (isAdmin(user)) return true
  return !!user.permisos?.[seccion]
}

/** ¿Puede el usuario editar en la sección? */
export function canEdit(user, seccion) {
  if (!user) return false
  if (isRaven(user)) return true
  if (isAdmin(user)) return true
  return user.permisos?.[seccion] === 'editar'
}

/** ¿Puede el usuario descargar en la sección? */
export function canDownload(user, seccion) {
  if (!user) return false
  if (isRaven(user)) return true
  return user.permisos?.[seccion] === 'descargar'
}

/** Alias genérico de canView */
export const canAccess = canView
