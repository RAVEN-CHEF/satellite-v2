'use client'
import { useAuth } from '@/context/AuthContext'
import { canView, canEdit, canDownload, isRaven, isAdmin } from '@/lib/permissions'

export function usePermission(seccion) {
  const { user } = useAuth()
  return {
    view:     canView(user, seccion),
    edit:     canEdit(user, seccion),
    download: canDownload(user, seccion),
    isRaven:  isRaven(user),
    isAdmin:  isAdmin(user),
  }
}
