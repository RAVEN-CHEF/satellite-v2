'use client'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import AccessDenied from '@/components/ui/AccessDenied'
import HorariosSection from '@/components/horarios/HorariosSection'

export default function HorariosPage() {
  const { user } = useAuth()
  const perm     = usePermission('horarios')

  if (!perm.view) return <div style={{ padding:32 }}><AccessDenied /></div>

  return (
    <HorariosSection
      userEmail={user?.email ?? ''}
      userRole={user?.role ?? 'empleado'}
      userId={user?.id ?? ''}
    />
  )
}
