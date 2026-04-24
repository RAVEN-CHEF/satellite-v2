'use client'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import AccessDenied from '@/components/ui/AccessDenied'
import RecetasSection from '@/components/recetas/RecetasSection'

export default function RecetasPage() {
  const { user } = useAuth()
  const perm     = usePermission('recetas')

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  return <RecetasSection userRole={user?.role ?? 'empleado'} />
}
